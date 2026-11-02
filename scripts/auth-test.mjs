// Uji rate limit login + ganti/reset password. Jalankan: node scripts/auth-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.AUTH_PORT || 3989);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDb = path.join(os.tmpdir(), `lms-auth-${process.pid}.json`);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const tenant = db.tenants[0];
const adminFixture = db.users.find((user) => user.email === 'admin@lms.id' && user.role === 'super_admin');
if (adminFixture) adminFixture.password = bcrypt.hashSync('admin', 8);
const klass = db.classes[0] || { id: 'kelas-uji', tenant_id: tenant.id, nama: 'X-A', tingkat: 'X' };
if (!db.classes[0]) db.classes.push(klass);
db.users = db.users.filter((u) => !String(u.email || '').endsWith('@uji.local'));
db.students = db.students.filter((s) => !String(s.id).startsWith('siswa-'));
for (const kode of ['a', 'b']) {
  db.students.push({
    id: `siswa-${kode}`, tenant_id: tenant.id, nama: `Siswa ${kode.toUpperCase()}`, nis: `NIS-${kode.toUpperCase()}`,
    username: `siswa.${kode}`, email: `siswa.${kode}@uji.local`, class_id: klass.id,
    password: bcrypt.hashSync('rahasia123', 8), created_at: new Date().toISOString(),
  });
}
fs.writeFileSync(tmpDb, JSON.stringify(db, null, 2));

const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: tmpDb },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => { log += d; });
server.stderr.on('data', (d) => { log += d; });

const cookies = {};
async function req(method, url, body, as = 'anon') {
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
  return { status: res.status, json, text, retryAfter: res.headers.get('retry-after') };
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

  // --- pesan error seragam (anti-enumerasi) ---
  const wrongUser = await req('POST', '/api/login', { email: 'tidak-ada@uji.local', password: 'salah123' });
  const wrongPass = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'salah123' });
  check('pesan login seragam', wrongUser.status === 401 && wrongPass.status === 401 && wrongUser.json.error === wrongPass.json.error,
    `${wrongUser.json?.error} | ${wrongPass.json?.error}`);

  // --- rate limit /api/login ---
  const victim = 'kunci@uji.local';
  const codes = [];
  for (let i = 0; i < 5; i++) {
    const r = await req('POST', '/api/login', { email: victim, password: 'salah' });
    codes.push(r.status);
  }
  check('5 percobaan gagal dicatat', codes.every((c) => c === 401), codes.join(','));
  // Kebijakan sekarang: batas 10 gagal / 5 menit, dan password yang benar selalu diterima.
  const wrongBurst = [];
  for (let i = 0; i < 7; i++) {
    const r = await req('POST', '/api/login', { email: victim, password: 'salah' });
    wrongBurst.push(r.status);
  }
  const locked = wrongBurst[wrongBurst.length - 1];
  check('percobaan gagal ke-10 ke atas diblokir 429', locked === 429, `status=${wrongBurst.join(',')}`);
  if (locked === 429) {
    const lockedCorrect = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'admin' });
    check('kunci hanya untuk akun yang gagal, akun lain tetap bisa masuk',
      lockedCorrect.status === 200, `status=${lockedCorrect.status}`);
  } else {
    check('kunci hanya untuk akun yang gagal, akun lain tetap bisa masuk', false, 'tidak terkunci');
  }

  // --- rate limit /api/student/login + pesan seragam ---
  const sWrong1 = await req('POST', '/api/student/login', { username: 'tidak-ada', password: 'x' });
  const sWrong2 = await req('POST', '/api/student/login', { username: 'siswa.a', password: 'salah' });
  check('pesan login siswa seragam', sWrong1.status === 401 && sWrong2.status === 401 && sWrong1.json.error === sWrong2.json.error,
    `${sWrong1.json?.error} | ${sWrong2.json?.error}`);

  const sVictim = 'siswa.b';
  let sLocked = null;
  for (let i = 0; i < 12; i++) {
    sLocked = await req('POST', '/api/student/login', { username: sVictim, password: 'salah' });
  }
  check('login siswa ikut terkunci 429 setelah batas gagal', sLocked.status === 429, `status=${sLocked.status}`);

  // --- login normal tetap jalan (key berbeda) ---
  const adminLogin = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'admin' }, 'admin');
  check('login admin tetap 200', adminLogin.status === 200, `status=${adminLogin.status}`);
  const tenantSelect = await req('POST', '/api/tenants/select', { tenant_id: tenant.id }, 'admin');
  check('admin memilih tenant untuk pemantauan aktivitas', tenantSelect.status === 200, `status=${tenantSelect.status}`);
  const waSettings = await req('GET', '/api/admin/whatsapp', undefined, 'admin');
  check('konfigurasi WhatsApp terisolasi per tenant', waSettings.status === 200
    && waSettings.json.config.enabled === false
    && waSettings.json.connection.status === 'disconnected'
    && waSettings.json.timezone === 'Asia/Jakarta',
  `status=${waSettings.status} wa=${waSettings.json?.connection?.status}`);
  const invalidWaJob = await req('POST', '/api/admin/whatsapp/jobs', {
    schedule_id: 'jadwal-asing', group_id: 'grup@g.us', tanggal: '2026-12-01', waktu: '07:00'
  }, 'admin');
  check('pesan WA wajib memakai jadwal pelajaran tenant', invalidWaJob.status === 400, `status=${invalidWaJob.status}`);

  // --- ganti password sendiri ---
  const pw1 = await req('POST', '/api/me/password', { current_password: 'admin', new_password: 'RahasiaBaru123' }, 'admin');
  check('ganti password sendiri', pw1.status === 200, `status=${pw1.status}`);
  const adminProfile = await req('GET', '/api/me', undefined, 'admin');
  check('profil menandai password telah diganti', !!adminProfile.json?.password_changed_at, `changed=${!!adminProfile.json?.password_changed_at}`);
  const adminActivity = await req('GET', '/api/admin/activity-log', undefined, 'admin');
  check('log aktivitas dapat dibaca admin tenant', adminActivity.status === 200
    && adminActivity.json.events.some((event) => event.aksi === 'Mengganti password'),
  `status=${adminActivity.status}`);
  const pw1Short = await req('POST', '/api/me/password', { current_password: 'RahasiaBaru123', new_password: 'pendek' }, 'admin');
  check('password baru < 8 karakter ditolak', pw1Short.status === 400, `status=${pw1Short.status}`);
  const pw1WrongOld = await req('POST', '/api/me/password', { current_password: 'salah', new_password: 'RahasiaBaru456' }, 'admin');
  check('password lama salah ditolak', pw1WrongOld.status === 400, `status=${pw1WrongOld.status}`);

  const loginOld = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'admin' });
  const loginNew = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'RahasiaBaru123' });
  check('login pakai password lama gagal', loginOld.status === 401, `status=${loginOld.status}`);
  check('login pakai password baru berhasil', loginNew.status === 200, `status=${loginNew.status}`);

  // --- reset password siswa oleh admin ---
  const reset1 = await req('POST', '/api/students/siswa-a/reset-password', {}, 'admin');
  const pwBaru = reset1.json?.password;
  check('admin reset password siswa', reset1.status === 200 && typeof pwBaru === 'string' && pwBaru.length >= 8,
    `status=${reset1.status} panjang=${pwBaru ? pwBaru.length : 0}`);
  const loginLama = await req('POST', '/api/student/login', { username: 'siswa.a', password: 'rahasia123' });
  check('password lama siswa tidak berlaku', loginLama.status === 401, `status=${loginLama.status}`);
  const loginBaru = await req('POST', '/api/student/login', { username: 'siswa.a', password: pwBaru });
  check('password hasil reset bisa dipakai', loginBaru.status === 200, `status=${loginBaru.status}`);

  // --- siswa ganti password sendiri ---
  const studentCookie = loginBaru.status === 200 ? cookies.anon : '';
  const changeStudent = await req('POST', '/api/me/password', { current_password: pwBaru, new_password: 'SiswaBaru123' }, 'anon');
  check('siswa bisa ganti password sendiri', !!studentCookie && changeStudent.status === 200, `status=${changeStudent.status}`);
  const studentProfile = await req('GET', '/api/me', undefined, 'anon');
  check('profil siswa menandai password telah diganti', !!studentProfile.json?.password_changed_at,
    `changed=${!!studentProfile.json?.password_changed_at}`);
  const studentActivity = await req('GET', '/api/admin/activity-log', undefined, 'admin');
  check('ganti password siswa tercatat di admin', studentActivity.status === 200
    && studentActivity.json.events.some((event) => event.student_id === 'siswa-a' && event.aksi === 'Mengganti password'),
  `status=${studentActivity.status}`);
  const studentLogout = await req('POST', '/api/logout', {}, 'anon');
  const logoutActivity = await req('GET', '/api/admin/activity-log', undefined, 'admin');
  const logoutEvents = logoutActivity.json?.events || [];
  check('login dan logout siswa tercatat di admin', studentLogout.status === 200
    && logoutEvents.some((event) => event.student_id === 'siswa-a' && event.aksi === 'Logout')
    && logoutEvents.some((event) => event.student_id === 'siswa-a' && event.aksi === 'Login berhasil'),
  `logout=${studentLogout.status}`);

  // --- reset massal ---
  const bulk = await req('POST', '/api/students/reset-passwords', { class_id: klass.id }, 'admin');
  const kredensial = bulk.json?.credentials || [];
  check('reset massal mengembalikan kredensial', bulk.status === 200 && kredensial.length >= 2 && kredensial.every((c) => c.password && c.nis),
    `total=${bulk.json?.total}`);
  const loginBulk = await req('POST', '/api/student/login', { username: kredensial[0]?.username, password: kredensial[0]?.password });
  check('kredensial hasil reset massal valid', loginBulk.status === 200, `status=${loginBulk.status}`);
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
