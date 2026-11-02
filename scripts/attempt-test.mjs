// Uji pencatatan nilai berulang & penulisan bersamaan: setiap percobaan harus tersimpan.
// Jalankan: node scripts/attempt-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ATTEMPT_PORT || 3988);
const BASE = `http://127.0.0.1:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-attempt-'));
const dbPath = path.join(dir, 'db.json');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'db.json'), 'utf8'));
const tenant = (source.tenants || [])[0];
const kelas = (source.classes || []).find(c => (source.students || []).some(s => s.class_id === c.id));
const siswa = (source.students || []).filter(s => s.class_id === kelas.id).slice(0, 3);
if (siswa.length < 2) {
  console.error('Butuh minimal 2 siswa pada satu kelas di data/db.json');
  process.exit(1);
}
// Bersihkan percobaan/progres agar hitungannya pasti.
source.attempts = [];
source.progress = [];
fs.writeFileSync(dbPath, JSON.stringify(source, null, 2));

const child = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: dbPath, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let log = '';
child.stdout.on('data', d => { log += d.toString(); });
child.stderr.on('data', d => { log += d.toString(); });

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/me`);
      if (res.status > 0) return true;
    } catch { /* belum siap */ }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function loginStudent(nis) {
  const res = await fetch(`${BASE}/api/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: nis, password: nis })
  });
  const cookie = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).join('; ');
  return { status: res.status, cookie };
}

async function submit(cookie, babId, answers) {
  const res = await fetch(`${BASE}/api/kurikulum/${babId}/evaluasi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ answers })
  });
  return res.json().catch(() => ({}));
}

let exitCode = 1;
try {
  const ready = await waitForServer();
  check('server uji berjalan', ready, ready ? '' : log.slice(0, 200));
  if (!ready) throw new Error('server tidak siap');

  const sessions = [];
  for (const s of siswa) {
    const login = await loginStudent(s.nis);
    if (login.status === 200) sessions.push({ nis: s.nis, cookie: login.cookie });
  }
  check('login siswa untuk uji berhasil', sessions.length >= 2, `siswa=${sessions.length}`);

  const babId = 'x-01';
  // 1. Dua percobaan berurutan oleh siswa yang sama.
  const first = await submit(sessions[0].cookie, babId, {});
  const second = await submit(sessions[0].cookie, babId, {});
  check('percobaan pertama tercatat', first.attempts === 1, `attempts=${first.attempts}`);
  check('percobaan kedua tercatat (nomor naik)', second.attempts === 2, `attempts=${second.attempts}`);
  check('nilai tertinggi & pengurangan dihitung dari kedua percobaan',
    typeof second.highest_attempt === 'number' && second.penalty_count >= 0,
    `tertinggi=${second.highest_score} ke=${second.highest_attempt} penalty=${second.penalty_count}`);

  // 2. Pengiriman bersamaan oleh beberapa siswa: tidak boleh ada yang hilang.
  const burst = [];
  const rounds = 3;
  for (let i = 0; i < rounds; i++) {
    for (const s of sessions) burst.push(submit(s.cookie, babId, {}));
  }
  const settled = await Promise.all(burst);
  const okResponses = settled.filter(r => r && typeof r.attempts === 'number').length;
  check('semua pengiriman bersamaan dijawab server', okResponses === burst.length, `ok=${okResponses}/${burst.length}`);

  const dbAfter = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const perStudent = new Map();
  for (const a of dbAfter.attempts || []) {
    perStudent.set(a.student_id, (perStudent.get(a.student_id) || 0) + 1);
  }
  const counts = [...perStudent.values()];
  const expectedFirst = 2 + rounds; // 2 percobaan berurutan + burst
  const expectedOthers = rounds;
  const siswaIds = siswa.map(s => s.id);
  const actualFirst = perStudent.get(siswaIds[0]) || 0;
  const actualOthers = siswaIds.slice(1).map(id => perStudent.get(id) || 0);
  check('setiap siswa menyimpan seluruh percobaannya (tidak ada lost update)',
    actualFirst === expectedFirst && actualOthers.every(c => c === expectedOthers),
    `siswa1=${actualFirst}/${expectedFirst} lain=${actualOthers.join(',')}/${expectedOthers}`);

  const uniqueKe = new Set(
    (dbAfter.attempts || []).map(a => `${a.student_id}|${a.ke}`)
  );
  check('nomor percobaan tidak pernah kembar',
    uniqueKe.size === (dbAfter.attempts || []).length,
    `unik=${uniqueKe.size} total=${(dbAfter.attempts || []).length}`);

  // 3. Riwayat nilai terbaca lengkap dan berurutan.
  const grades = await fetch(`${BASE}/api/grades?student_id=${siswa.find(s => s.nis === sessions[0].nis).id}`, {
    headers: { Cookie: sessions[0].cookie }
  }).then(r => r.json());
  const materiRow = (Array.isArray(grades) ? grades : []).find(g => g.tipe === 'Materi Evaluasi');
  check('rekap nilai memuat jumlah percobaan',
    !!materiRow && Number(materiRow.jumlah_percobaan) === expectedFirst,
    `jumlah_percobaan=${materiRow && materiRow.jumlah_percobaan} diharapkan=${expectedFirst}`);
  check('rekap nilai memuat nilai tertinggi dan pengurangan',
    !!materiRow && materiRow.nilai_tertinggi !== undefined && materiRow.pengurangan_nilai !== undefined,
    `tertinggi=${materiRow && materiRow.nilai_tertinggi}`);

  // 4. Formulir tugas tidak boleh gagal terbuka karena elemen hilang.
  const adminHtml = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
  const adminJs = fs.readFileSync(path.join(root, 'public/assets/js/admin.js'), 'utf8');
  const htmlIds = new Set([...adminHtml.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const usedIds = [...new Set([...adminJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]))];
  const missing = usedIds.filter(id => !htmlIds.has(id));
  check('semua id yang dipakai admin.js ada di admin.html', missing.length === 0, missing.join(', '));
  check('input tersembunyi assignment-id tersedia di formulir tugas',
    adminHtml.includes('id="assignment-id"'), '');
  check('formulir tugas aman bila elemen hilang (guard setVal)',
    adminJs.includes('const setVal = (id, value)') && adminJs.includes("setVal('assignment-id', '')"), '');
} catch (error) {
  check('uji berjalan tanpa error tak terduga', false, error.message);
} finally {
  child.kill();
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 3000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) console.log('Gagal:\n' + failed.map(f => ' - ' + f.name).join('\n'));
  exitCode = failed.length ? 1 : 0;
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
process.exit(exitCode);
