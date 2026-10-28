// Uji alur menjawab soal: opsi bisa dipilih & skor terhitung. Jalankan: node scripts/quiz-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.QUIZ_PORT || 3990);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDb = path.join(os.tmpdir(), `lms-quiz-${process.pid}.json`);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

// ---------- 1. render opsi harus membawa data-soal ----------
const belajarSrc = fs.readFileSync(path.join(root, 'public/assets/js/belajar.js'), 'utf8');
const sandbox = {
  console,
  alert: () => {},
  document: {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: { classList: { add() {}, remove() {} } },
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  fetch: async () => ({ ok: true, json: async () => ({}) }),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(belajarSrc, sandbox);
} catch (e) {
  check('belajar.js bisa dimuat', false, e.message);
}
const blRenderSoal = sandbox.blRenderSoal;

function renderInputs(soal) {
  return String(blRenderSoal(soal, 0) || '');
}

if (typeof blRenderSoal === 'function') {
  const cases = [
    { tipe: 'pgm', soal: { id: 'soal-1', tipe: 'pgm', opsi: ['A', 'B', 'C'], kunci: [1] } },
    { tipe: 'pg_singkat', soal: { id: 'soal-2', tipe: 'pg_singkat', opsi: ['A', 'B'], kunci: [0] } },
    { tipe: 'pg_kompleks', soal: { id: 'soal-3', tipe: 'pg_kompleks', opsi: ['A', 'B', 'C'], kunci: [0, 2] } },
    { tipe: 'benar_salah', soal: { id: 'soal-4', tipe: 'benar_salah', pernyataan: [{ teks: 'x' }], kunci: ['B'] } },
  ];
  for (const c of cases) {
    const html = renderInputs(c.soal);
    const inputs = html.match(/<input[^>]*>/g) || [];
    const withSoal = inputs.filter((tag) => tag.includes(`data-soal="${c.soal.id}"`));
    check(`opsi ${c.tipe} punya data-soal`, inputs.length > 0 && withSoal.length === inputs.length,
      `input=${inputs.length} sesuai=${withSoal.length}`);
  }
} else {
  check('blRenderSoal tersedia', false, 'fungsi tidak terdefinisi');
}

// ---------- 1b. alur exam: nama input sama antara render & submit ----------
const studentSrc = fs.readFileSync(path.join(root, 'public/assets/js/student.js'), 'utf8');
check('exam: nama radio render = submit', studentSrc.includes('name="exam-${examId}-${i}"') && studentSrc.includes('input[name="exam-${examId}-${i}"]:checked'),
  '');
check('exam: tidak lagi memakai s.jawaban di klien', !/s\.jawaban|q\.jawaban/.test(studentSrc), '');
const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const tenant = db.tenants[0];
const klass = db.classes[0] || { id: 'kelas-uji', tenant_id: tenant.id, nama: 'X-A', tingkat: 'X' };
if (!db.classes[0]) db.classes.push(klass);
db.students = db.students.filter((s) => !String(s.id).startsWith('siswa-'));
db.students.push({
  id: 'siswa-a', tenant_id: tenant.id, nama: 'Siswa A', nis: 'NIS-A', username: 'siswa.a',
  email: 'siswa.a@uji.local', class_id: klass.id, kelas_level: 'X',
  password: bcrypt.hashSync('rahasia123', 8), created_at: new Date().toISOString(),
});
db.progress = [];
db.attempts = [];
db.users = db.users.filter((u) => !String(u.email || '').endsWith('@uji.local'));
fs.writeFileSync(tmpDb, JSON.stringify(db, null, 2));

const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: tmpDb },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => { log += d; });
server.stderr.on('data', (d) => { log += d; });

let cookie = '';
async function req(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.getSetCookie?.() || [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* bukan json */ }
  return { status: res.status, json, text };
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + '/api/me');
      if (r.status === 401 || r.status === 200) return true;
    } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function answersFromKunci(soal) {
  const out = {};
  for (const s of soal) {
    const k = Array.isArray(s.kunci) ? s.kunci : [s.kunci];
    if (s.tipe === 'pgm' || s.tipe === 'pg_singkat') out[s.id] = Number(k[0]);
    else if (s.tipe === 'benar_salah') out[s.id] = k.map(String);
    else if (s.tipe === 'menjodohkan') out[s.id] = k.map(String);
    else out[s.id] = k.map(Number);
  }
  return out;
}

// Kunci dibaca dari berkas konten (bukan dari API, karena API sengaja menyembunyikannya).
function loadBabFromDisk(level, babId) {
  const dir = path.join(root, 'data/kurikulum', `kelas-${String(level).toLowerCase()}`);
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const babs = data.babs || data;
    const found = babs.find((b) => b.id === babId);
    if (found) return found;
  }
  return null;
}

try {
  check('server siap', await waitReady(), path.basename(tmpDb));
  const login = await req('POST', '/api/student/login', { username: 'siswa.a', password: 'rahasia123' });
  check('login siswa', login.status === 200, `status=${login.status}`);

  const kur = await req('GET', '/api/kurikulum');
  const bab = kur.json?.babs?.find((b) => b.unlocked) || kur.json?.babs?.[0];
  check('kurikulum punya bab', !!bab, `bab=${bab?.id || '-'}`);

  const detail = await req('GET', `/api/kurikulum/${bab.id}`);
  const soal = detail.json?.soal || [];
  check('detail bab memuat soal + opsi', soal.length > 0 && soal.every((s) => Array.isArray(s.opsi) || s.tipe === 'benar_salah' || s.tipe === 'menjodohkan'),
    `soal=${soal.length}`);
  check('detail bab tidak membocorkan kunci', soal.every((s) => s.kunci === undefined), '');

  const diskBab = loadBabFromDisk(db.students.find((s) => s.id === 'siswa-a')?.kelas_level || 'X', bab.id);
  check('bab ditemukan di berkas konten', !!diskBab, `bab=${bab.id}`);

  const kunciMap = answersFromKunci(diskBab.soal);
  const benar = await req('POST', `/api/kurikulum/${bab.id}/evaluasi`, { answers: kunciMap });
  check('jawaban benar -> skor 100', benar.status === 200 && benar.json.score === 100,
    `status=${benar.status} score=${benar.json?.score}`);
  check('jawaban benar -> tuntas', benar.json?.tuntas === true, `tuntas=${benar.json?.tuntas}`);
  check('kunci dibuka setelah tuntas', (benar.json?.hasil || []).every((h) => 'kunci' in h), '');

  const kosong = await req('POST', `/api/kurikulum/${bab.id}/evaluasi`, { answers: {} });
  check('tanpa jawaban -> skor 0', kosong.status === 200 && kosong.json.score === 0,
    `score=${kosong.json?.score}`);

  const bentukLama = await req('POST', `/api/kurikulum/${bab.id}/evaluasi`, { answers: { undefined: 0 } });
  check('bentuk jawaban lama (tanpa data-soal) -> skor 0', bentukLama.status === 200 && bentukLama.json.score === 0,
    `score=${bentukLama.json?.score}`);
} finally {
  server.kill();
  fs.rmSync(tmpDb, { force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- server log ---\n' + log.split(/\r?\n/).slice(0, 10).join('\n'));
  process.exit(1);
}
