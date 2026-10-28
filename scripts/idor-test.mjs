// Uji IDOR level data: siswa tidak boleh membaca/mengubah data siswa lain.
// Jalankan: node scripts/idor-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.IDOR_PORT || 3994);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDb = path.join(os.tmpdir(), `lms-idor-${process.pid}.json`);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

// ---------- siapkan DB sementara ----------
const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const tenant = db.tenants[0];
if (!tenant) throw new Error('tidak ada tenant di data/db.json');

const subject = db.subjects[0] || { id: 'subj-uji', tenant_id: tenant.id, nama: 'Geografi', kode: 'GEO' };
const klass = db.classes[0] || { id: 'kelas-uji', tenant_id: tenant.id, nama: 'X-A', tingkat: 'X' };
if (!db.subjects[0]) db.subjects.push(subject);
if (!db.classes[0]) db.classes.push(klass);

const pwHash = bcrypt.hashSync('rahasia123', 8);
const mk = (kode) => ({
  id: `siswa-${kode}`, tenant_id: tenant.id, nama: `Siswa ${kode.toUpperCase()}`,
  nis: `NIS-${kode.toUpperCase()}`, username: `siswa.${kode}`, email: `siswa.${kode}@uji.local`,
  class_id: klass.id, password: pwHash, created_at: new Date().toISOString(),
});
db.students = db.students.filter((s) => !String(s.id).startsWith('siswa-'));
db.students.push(mk('a'), mk('b'));
db.users = db.users.filter((u) => !String(u.email || '').endsWith('@uji.local'));
db.users.push({ id: 'user-unlinked', email: 'unlinked@uji.local', password: pwHash, nama: 'Tanpa Data Siswa', role: 'student', tenant_id: tenant.id, created_at: new Date().toISOString() });
db.grades = [
  { id: 'grade-a', tenant_id: tenant.id, student_id: 'siswa-a', subject_id: subject.id, class_id: klass.id, nilai: 90, tipe: 'tugas', created_at: new Date().toISOString() },
  { id: 'grade-b', tenant_id: tenant.id, student_id: 'siswa-b', subject_id: subject.id, class_id: klass.id, nilai: 60, tipe: 'tugas', created_at: new Date().toISOString() },
];
db.attendance = [
  { id: 'att-a', tenant_id: tenant.id, student_id: 'siswa-a', kelas_id: klass.id, date: '2026-10-01', status: 'hadir', created_at: new Date().toISOString() },
  { id: 'att-b', tenant_id: tenant.id, student_id: 'siswa-b', kelas_id: klass.id, date: '2026-10-01', status: 'alfa', created_at: new Date().toISOString() },
];
db.exams = [
  { id: 'exam-a', tenant_id: tenant.id, judul: 'Ujian Kelas Sendiri', subject_id: subject.id, class_id: klass.id, durasi: 60, created_at: new Date().toISOString() },
  { id: 'exam-b', tenant_id: tenant.id, judul: 'Ujian Kelas Lain', subject_id: subject.id, class_id: 'kelas-lain', durasi: 60, created_at: new Date().toISOString() },
];
fs.writeFileSync(tmpDb, JSON.stringify(db, null, 2));

// ---------- server ----------
const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: tmpDb },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => { log += d; });
server.stderr.on('data', (d) => { log += d; });

let cookies = { student: '', admin: '' };
async function req(method, url, body, as = 'student') {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookies[as] ? { Cookie: cookies[as] } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.getSetCookie?.() || [];
  if (sc.length) cookies[as] = sc.map((c) => c.split(';')[0]).join('; ');
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

try {
  check('server siap (DB sementara)', await waitReady(), path.basename(tmpDb));

  const login = await req('POST', '/api/student/login', { username: 'siswa.a', password: 'rahasia123' });
  check('login siswa berhasil', login.status === 200, `status=${login.status}`);

  const me = await req('GET', '/api/me');
  check('GET /api/me tetap 200', me.status === 200, `status=${me.status}`);

  const g = await req('GET', '/api/grades');
  const ids = Array.isArray(g.json) ? g.json.map((x) => x.student_id) : [];
  check('nilai: hanya milik sendiri', g.status === 200 && ids.every((id) => id === 'siswa-a'),
    `status=${g.status} student_id=${[...new Set(ids)].join(',') || 'kosong'}`);

  const gB = await req('GET', '/api/grades?student_id=siswa-b');
  check('nilai: filter siswa lain ditolak', gB.status === 403 || (Array.isArray(gB.json) && gB.json.length === 0),
    `status=${gB.status} rows=${Array.isArray(gB.json) ? gB.json.length : '?'}`);

  const att = await req('GET', '/api/attendance');
  const attIds = Array.isArray(att.json) ? att.json.map((x) => x.student_id) : [];
  check('absensi: hanya milik sendiri', att.status === 200 && attIds.every((id) => id === 'siswa-a'),
    `status=${att.status} student_id=${[...new Set(attIds)].join(',') || 'kosong'}`);

  const st = await req('GET', '/api/students');
  check('daftar siswa: 403 untuk siswa', st.status === 403, `status=${st.status}`);

  const ex = await req('GET', '/api/exams');
  const exIds = Array.isArray(ex.json) ? ex.json.map((x) => x.id) : [];
  check('ujian: hanya kelas sendiri', ex.status === 200 && exIds.length === 1 && exIds[0] === 'exam-a',
    `status=${ex.status} exams=${exIds.join(',') || 'kosong'}`);

  const adminLogin = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'admin' }, 'admin');
  const exAdmin = await req('GET', '/api/exams', null, 'admin');
  const exAdminIds = Array.isArray(exAdmin.json) ? exAdmin.json.map((x) => x.id) : [];
  check('ujian: admin tetap lihat semua', exAdminIds.length === 2, `exams=${exAdminIds.length}`);

  const dash = await req('GET', '/api/dashboard');
  check('dashboard admin: 403 untuk siswa', dash.status === 403, `status=${dash.status}`);

  const add = await req('POST', '/api/students', { nama: 'Palsu', nis: 'X999' });
  check('tambah siswa: 403 untuk siswa', add.status === 403, `status=${add.status}`);

  const del = await req('DELETE', '/api/grades/grade-b');
  const adminView = await req('GET', '/api/grades?student_id=siswa-b', null, 'admin');
  const stillThere = Array.isArray(adminView.json) ? adminView.json : [];
  check('hapus nilai siswa lain: 403', del.status === 403, `status=${del.status}`);
  check('nilai siswa lain tidak terhapus', stillThere.length === 1 && stillThere[0].id === 'grade-b',
    `admin_login=${adminLogin.status} rows_after=${stillThere.length}`);

  const submit = await req('POST', '/api/grades', { student_id: 'siswa-b', subject_id: subject.id, class_id: klass.id, nilai: 100, tipe: 'ujian' });
  const ownAfter = await req('GET', '/api/grades');
  const injected = Array.isArray(ownAfter.json) ? ownAfter.json.filter((x) => x.nilai === 100) : [];
  check('kirim nilai: dipaksa ke siswa sendiri', submit.status === 403 || (injected.length === 1 && injected[0].student_id === 'siswa-a'),
    `status=${submit.status} tersimpan_untuk=${injected.map((x) => x.student_id).join(',') || '-'}`);

  const mat = await req('GET', '/api/materials');
  check('materi tetap bisa dibaca siswa', mat.status === 200, `status=${mat.status}`);

  const kur = await req('GET', '/api/kurikulum');
  check('kurikulum tetap bisa dibaca siswa', kur.status === 200, `status=${kur.status}`);

  const asg = await req('GET', '/api/assignments');
  check('tugas tetap bisa dibaca siswa', asg.status === 200, `status=${asg.status}`);

  const unl = await req('POST', '/api/login', { email: 'unlinked@uji.local', password: 'rahasia123' });
  const unlGrades = await req('GET', '/api/grades');
  check('akun siswa tanpa data siswa: ditolak', unl.status === 200 && unlGrades.status === 403,
    `login=${unl.status} grades=${unlGrades.status}`);
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
