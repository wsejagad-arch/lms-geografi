// Uji regresi temuan audit keamanan. Jalankan: node scripts/audit-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.AUDIT_PORT || 3992);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDb = path.join(os.tmpdir(), `lms-audit-${process.pid}.json`);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const tenant = db.tenants[0];
if (!tenant) throw new Error('tidak ada tenant di data/db.json');
const subject = db.subjects[0] || { id: 'subj-uji', tenant_id: tenant.id, nama: 'Geografi', kode: 'GEO' };
const klass = db.classes[0] || { id: 'kelas-uji', tenant_id: tenant.id, nama: 'X-A', tingkat: 'X' };
const otherKlass = { id: 'kelas-lain', tenant_id: tenant.id, nama: 'XI-B', tingkat: 'XI' };
if (!db.subjects[0]) db.subjects.push(subject);
if (!db.classes[0]) db.classes.push(klass);
if (!db.classes.some((c) => c.id === otherKlass.id)) db.classes.push(otherKlass);

const pwHash = bcrypt.hashSync('rahasia123', 8);
db.students = db.students.filter((s) => !String(s.id).startsWith('siswa-'));
db.students.push({
  id: 'siswa-a', tenant_id: tenant.id, nama: 'Siswa A', nis: 'NIS-A', username: 'siswa.a',
  email: 'siswa.a@uji.local', class_id: klass.id, password: pwHash, created_at: new Date().toISOString(),
});
db.users = db.users.filter((u) => !String(u.email || '').endsWith('@uji.local'));
db.exams = [
  { id: 'exam-a', tenant_id: tenant.id, judul: 'Ujian A', subject_id: subject.id, class_id: klass.id, durasi: 30, created_at: new Date().toISOString() },
];
db.questions = [
  { id: 'q1', tenant_id: tenant.id, pertanyaan: 'Soal 1', opsi_a: 'A', opsi_b: 'B', opsi_c: 'C', opsi_d: 'D', jawaban: 1, jenis: 'sumatif', poin: 10 },
  { id: 'q2', tenant_id: tenant.id, pertanyaan: 'Soal 2', opsi_a: 'A', opsi_b: 'B', opsi_c: 'C', opsi_d: 'D', jawaban: 2, jenis: 'sumatif', poin: 10 },
];
db.exam_questions = [{ exam_id: 'exam-a', question_id: 'q1' }, { exam_id: 'exam-a', question_id: 'q2' }];
db.materials = [
  { id: 'mat-a', tenant_id: tenant.id, judul: 'Materi kelas saya', konten: '<p>ok</p>', subject_id: subject.id, class_id: klass.id, semester: 1, created_at: new Date().toISOString() },
  { id: 'mat-b', tenant_id: tenant.id, judul: 'Materi kelas lain', konten: '<p>lain</p>', subject_id: subject.id, class_id: otherKlass.id, semester: 1, created_at: new Date().toISOString() },
];
db.assignments = [
  { id: 'asg-a', tenant_id: tenant.id, judul: 'Tugas kelas saya', subject_id: subject.id, class_id: klass.id, created_at: new Date().toISOString() },
  { id: 'asg-b', tenant_id: tenant.id, judul: 'Tugas kelas lain', subject_id: subject.id, class_id: otherKlass.id, created_at: new Date().toISOString() },
];
db.grades = [];
fs.writeFileSync(tmpDb, JSON.stringify(db, null, 2));

const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: tmpDb },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => { log += d; });
server.stderr.on('data', (d) => { log += d; });

const cookies = { student: '', admin: '' };
const setCookies = { student: [], admin: [] };
async function req(method, url, body, as = 'student') {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookies[as] ? { Cookie: cookies[as] } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.getSetCookie?.() || [];
  if (sc.length) {
    cookies[as] = sc.map((c) => c.split(';')[0]).join('; ');
    setCookies[as] = sc;
  }
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
  check('server siap', await waitReady(), path.basename(tmpDb));

  // #3/#4 sanitizer (tanpa browser)
  const { lmsSanitize, lmsEsc } = require(path.join(root, 'public/assets/js/sanitize.js'));
  check('sanitasi: script dibuang', !/script/i.test(lmsSanitize('<script>alert(1)</script><p>a</p>')));
  check('sanitasi: onerror dibuang', !/onerror/i.test(lmsSanitize('<img src=x onerror=alert(1)>')));
  check('sanitasi: javascript: ditolak', !/javascript:/i.test(lmsSanitize('<a href="javascript:alert(1)">x</a>')));
  check('escape: karakter html di-encode', lmsEsc('<b>"x"&') === '&lt;b&gt;&quot;x&quot;&amp;');

  // #1 register
  const regAnon = await req('POST', '/api/register', { email: 'x@x.test', password: 'x', role: 'super_admin' }, 'anon');
  check('#1 register tanpa login ditolak', regAnon.status === 401, `status=${regAnon.status}`);

  const adminLogin = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'admin' }, 'admin');
  check('login admin (DB siap)', adminLogin.status === 200, `status=${adminLogin.status}`);

  // #9 atribut cookie sesi
  const c = setCookies.admin.join(';');
  check('#9 cookie HttpOnly', /HttpOnly/i.test(c), c.split(';').slice(1).join(';').trim().slice(0, 40));
  check('#9 cookie SameSite=Lax', /SameSite=Lax/i.test(c), '');

  const studentLogin = await req('POST', '/api/student/login', { username: 'siswa.a', password: 'rahasia123' });
  check('login siswa (DB siap)', studentLogin.status === 200, `status=${studentLogin.status}`);

  const regStudent = await req('POST', '/api/register', { email: 'z@z.test', password: 'x', role: 'super_admin' });
  check('#1 register oleh siswa ditolak', regStudent.status === 403, `status=${regStudent.status}`);

  const regAdmin = await req('POST', '/api/register', { email: 'guru@uji.test', password: 'rahasia123', nama: 'Guru', role: 'super_admin', tenant_id: tenant.id }, 'admin');
  check('#1 role super_admin dipaksa jadi teacher', regAdmin.status === 200 && regAdmin.json.role === 'teacher',
    `status=${regAdmin.status} role=${regAdmin.json?.role}`);

  // #7 kunci jawaban tidak bocor
  const exStudent = await req('GET', '/api/exams');
  const qStudent = exStudent.json?.[0]?.questions || [];
  check('#7 soal siswa tanpa jawaban', qStudent.length === 2 && qStudent.every((q) => !('jawaban' in q)),
    `soal=${qStudent.length} ada_jawaban=${qStudent.some((q) => 'jawaban' in q)}`);

  const exAdmin = await req('GET', '/api/exams', null, 'admin');
  const qAdmin = exAdmin.json?.[0]?.questions || [];
  check('#7 admin tetap lihat jawaban', qAdmin.every((q) => 'jawaban' in q), `soal=${qAdmin.length}`);

  // #6 nilai dihitung server
  const submitTrue = await req('POST', '/api/exams/exam-a/submit', {
    answers: [{ question_id: 'q1', jawaban: 1 }, { question_id: 'q2', jawaban: 2 }],
  });
  check('#6 submit ujian benar -> nilai 100', submitTrue.status === 200 && submitTrue.json.nilai === 100,
    `status=${submitTrue.status} nilai=${submitTrue.json?.nilai}`);

  const submitFalse = await req('POST', '/api/exams/exam-a/submit', {
    answers: [{ question_id: 'q1', jawaban: 0 }, { question_id: 'q2', jawaban: 0 }],
  });
  check('#6 jawaban salah -> nilai 0', submitFalse.status === 200 && submitFalse.json.nilai === 0,
    `nilai=${submitFalse.json?.nilai}`);

  const forgeGrade = await req('POST', '/api/grades', { student_id: 'siswa-a', subject_id: subject.id, class_id: klass.id, nilai: 100 });
  check('#6 siswa tidak bisa menulis nilai langsung', forgeGrade.status === 403, `status=${forgeGrade.status}`);

  const ownGrades = await req('GET', '/api/grades');
  const nilaiTersimpan = (ownGrades.json || []).map((g) => g.nilai).sort((a, b) => a - b);
  check('#6 nilai tersimpan hanya hasil server', JSON.stringify(nilaiTersimpan) === '[0,100]', `nilai=${nilaiTersimpan.join(',')}`);

  // #10 filter kelas
  const mats = await req('GET', '/api/materials');
  const matIds = (mats.json || []).map((m) => m.id);
  check('#10 materi hanya kelas sendiri', mats.status === 200 && matIds.length === 1 && matIds[0] === 'mat-a',
    `materi=${matIds.join(',') || 'kosong'}`);

  const asgs = await req('GET', '/api/assignments');
  const asgIds = (asgs.json || []).map((a) => a.id);
  check('#10 tugas hanya kelas sendiri', asgs.status === 200 && asgIds.length === 1 && asgIds[0] === 'asg-a',
    `tugas=${asgIds.join(',') || 'kosong'}`);
  check('#10 tugas menyertakan nama mapel/kelas', (asgs.json?.[0]?.subject_nama || '-') !== undefined && 'class_nama' in (asgs.json?.[0] || {}),
    `subject_nama=${asgs.json?.[0]?.subject_nama}`);

  // #5 password awal siswa = NIS (kebijakan sekolah), bisa diganti admin/user
  const newStudent = await req('POST', '/api/students', { nama: 'Siswa Baru', nis: 'NIS-BARU', email: 'baru@uji.local', class_id: klass.id }, 'admin');
  const generated = newStudent.json?.password;
  check('#5 password awal = NIS', newStudent.status === 200 && generated === 'NIS-BARU',
    `status=${newStudent.status} password=${generated}`);

  const loginNis = await req('POST', '/api/student/login', { username: 'baru@uji.local', password: 'NIS-BARU' }, 'anon');
  check('#5 login pakai NIS berhasil', loginNis.status === 200, `status=${loginNis.status}`);

  const loginWrong = await req('POST', '/api/student/login', { username: 'baru@uji.local', password: 'salah-sekali' }, 'anon');
  check('#5 password salah tetap ditolak', loginWrong.status === 401, `status=${loginWrong.status}`);

  const loginByNis = await req('POST', '/api/student/login', { username: 'NIS-BARU', password: 'NIS-BARU' }, 'anon');
  check('#5 login pakai NIS sebagai username juga bisa', loginByNis.status === 200, `status=${loginByNis.status}`);

  // #8 mutasi admin-only
  const disposable = await req('POST', '/api/students', { nama: 'Siswa Hapus', nis: 'NIS-HAPUS', email: 'hapus@uji.local', class_id: klass.id }, 'admin');
  const guruLogin = await req('POST', '/api/login', { email: 'guru@uji.test', password: 'rahasia123' }, 'anon');
  const delByGuru = await req('DELETE', `/api/students/${disposable.json?.id}`, null, 'anon');
  check('#8 teacher tidak bisa hapus siswa', guruLogin.status === 200 && delByGuru.status === 403,
    `login=${guruLogin.status} hapus=${delByGuru.status}`);

  // #7 kunci kurikulum tidak dibuka saat belum tuntas
  const kur = await req('GET', '/api/kurikulum');
  const babId = kur.json?.babs?.[0]?.id;
  if (babId) {
    const eval1 = await req('POST', `/api/kurikulum/${babId}/evaluasi`, { answers: {} });
    const hasil = eval1.json?.hasil || [];
    check('#7 kunci kurikulum tidak dibuka saat gagal', eval1.status === 200 && hasil.length > 0 && hasil.every((h) => !('kunci' in h)),
      `status=${eval1.status} soal=${hasil.length}`);
  } else {
    check('#7 kunci kurikulum tidak dibuka saat gagal', false, 'bab tidak ditemukan');
  }
} finally {
  server.kill();
  fs.rmSync(tmpDb, { force: true });
}

// #2 seed admin: DB kosong + ADMIN_PASSWORD
if (process.env.SKIP_SEED_TEST !== '1') {
  const emptyDb = path.join(os.tmpdir(), `lms-audit-empty-${process.pid}.json`);
  fs.writeFileSync(emptyDb, JSON.stringify({ users: [], tenants: [] }, null, 2));
  const PORT2 = PORT + 1;
  const s2 = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT2), LMS_DB_PATH: emptyDb, ADMIN_PASSWORD: 'rahasia-seed-123' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log2 = '';
  s2.stdout.on('data', (d) => { log2 += d; });
  s2.stderr.on('data', (d) => { log2 += d; });
  try {
    let ok = false;
    for (let i = 0; i < 60; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT2}/api/me`);
        if (r.status === 401 || r.status === 200) { ok = true; break; }
      } catch { /* belum siap */ }
      await new Promise((r) => setTimeout(r, 250));
    }
    check('server DB kosong siap', ok, `port=${PORT2}`);
    const post = (p, b) => fetch(`http://127.0.0.1:${PORT2}${p}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b),
    });
    const withEnv = await post('/api/login', { email: 'admin@lms.id', password: 'rahasia-seed-123' });
    check('#2 password seed dari ADMIN_PASSWORD', withEnv.status === 200, `status=${withEnv.status}`);
    const withDefault = await post('/api/login', { email: 'admin@lms.id', password: 'admin' });
    check('#2 password default lama ditolak', withDefault.status === 401, `status=${withDefault.status}`);
    check('#2 kredensial tidak dicetak ke log', !/admin@lms\.id \/ admin/.test(log2), '');
  } finally {
    s2.kill();
    fs.rmSync(emptyDb, { force: true });
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- server log ---\n' + log.split(/\r?\n/).slice(0, 10).join('\n'));
  process.exit(1);
}
