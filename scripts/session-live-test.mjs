// Uji panel User Aktif realtime. Jalankan: node scripts/session-live-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SESSION_PORT || 3988);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDb = path.join(os.tmpdir(), `lms-session-${process.pid}.json`);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const tenant = db.tenants[0];
const klass = db.classes[0] || { id: 'kelas-uji', tenant_id: tenant.id, nama: 'X-A', tingkat: 'X' };
if (!db.classes[0]) db.classes.push(klass);
db.users = db.users.filter((u) => !String(u.email || '').endsWith('@uji.local'));
db.students = db.students.filter((s) => !String(s.id).startsWith('siswa-'));
db.students.push({
  id: 'siswa-a', tenant_id: tenant.id, nama: 'Siswa A', nis: 'NIS-A', username: 'siswa.a',
  email: 'siswa.a@uji.local', class_id: klass.id,
  password: bcrypt.hashSync('rahasia123', 8), created_at: new Date().toISOString(),
});
const nowIso = new Date().toISOString();
const oldIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
db.session_logs = [
  { id: 'sess-now', user_id: 'u-now', nama: 'Aktif Sekarang', email: 'now@uji.local', role: 'teacher', tenant_id: tenant.id, ip: '1.1.1.1', lokasi: 'Jakarta, ID', ua: 'tes', login_at: nowIso, last_seen_at: nowIso, active: true },
  { id: 'sess-old', user_id: 'u-old', nama: 'Lama', email: 'old@uji.local', role: 'teacher', tenant_id: tenant.id, ip: '2.2.2.2', lokasi: 'Bandung, ID', ua: 'tes', login_at: oldIso, last_seen_at: oldIso, active: true },
  { id: 'sess-out', user_id: 'u-out', nama: 'Sudah Logout', email: 'out@uji.local', role: 'teacher', tenant_id: tenant.id, ip: '3.3.3.3', lokasi: '', ua: 'tes', login_at: oldIso, last_seen_at: nowIso, logout_at: nowIso, active: false },
];
fs.writeFileSync(tmpDb, JSON.stringify(db, null, 2));

const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: tmpDb, SESSION_TOUCH_MS: '500' },
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

  const admin = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'admin' }, 'admin');
  check('login admin', admin.status === 200, `status=${admin.status}`);

  const s1 = await req('GET', '/api/admin/sessions', null, 'admin');
  const rows = s1.json?.sessions || [];
  const find = (id) => rows.find((r) => r.id === id);
  check('API mengembalikan daftar sesi', s1.status === 200 && rows.length >= 3, `rows=${rows.length}`);
  check('window online = 2 menit', s1.json?.online_window_minutes === 2, `window=${s1.json?.online_window_minutes}`);

  check('sesi baru aktif dihitung online', find('sess-now')?.online === true, `online=${find('sess-now')?.online}`);
  check('detik_lalu kecil untuk sesi baru', (find('sess-now')?.detik_lalu ?? 999) < 10, `detik_lalu=${find('sess-now')?.detik_lalu}`);
  check('sesi 5 menit lalu tidak online', find('sess-old')?.online === false, `online=${find('sess-old')?.online}`);
  check('sesi logout tidak online', find('sess-out')?.online === false, `online=${find('sess-out')?.online}`);
  check('online_count tersedia', s1.json?.online_count >= 1, `count=${s1.json?.online_count}`);
  check('server_time tersedia', !!s1.json?.server_time, s1.json?.server_time || '');

  // aktivitas siswa langsung terlihat di panel
  const stu = await req('POST', '/api/student/login', { username: 'siswa.a', password: 'rahasia123' }, 'siswa');
  check('login siswa', stu.status === 200, `status=${stu.status}`);
  const s2 = await req('GET', '/api/admin/sessions', null, 'admin');
  const studentRow = (s2.json?.sessions || []).find((r) => r.email === 'siswa.a@uji.local' || r.nis === 'NIS-A');
  check('siswa langsung muncul online', !!studentRow && studentRow.online === true, `online=${studentRow?.online}`);
  check('siswa punya kelas & NIS', studentRow?.nis === 'NIS-A' && !!studentRow?.kelas_nama, `${studentRow?.nis} / ${studentRow?.kelas_nama}`);

  // last_seen ikut ter-update saat ada aktivitas baru (throttle 500ms pada test)
  const firstSeen = studentRow?.last_seen_at;
  await new Promise((r) => setTimeout(r, 900));
  await req('GET', '/api/materials', null, 'siswa');
  const s3 = await req('GET', '/api/admin/sessions', null, 'admin');
  const studentRow2 = (s3.json?.sessions || []).find((r) => r.nis === 'NIS-A');
  check('last_seen diperbarui oleh aktivitas', studentRow2?.last_seen_at && studentRow2.last_seen_at !== firstSeen,
    `${firstSeen} -> ${studentRow2?.last_seen_at}`);
  check('detik_lalu kembali mendekati 0', (studentRow2?.detik_lalu ?? 999) <= 2, `detik_lalu=${studentRow2?.detik_lalu}`);
} finally {
  server.kill();
  fs.rmSync(tmpDb, { force: true });
}

// --- cek sisi frontend (statis) ---
const adminJs = fs.readFileSync(path.join(root, 'public/assets/js/admin.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
check('panel auto-refresh 10 detik', adminJs.includes('}, 10000);'), '');
check('polling berhenti saat menu ditinggalkan', adminJs.includes('stopSessionsLive') && adminJs.includes("menu !== 'sessions'"), '');
check('indikator live ada di markup', adminHtml.includes('id="sessions-live"') && adminHtml.includes('id="sessions-note"'), '');
check('tampilkan detik_lalu relatif', adminJs.includes('sessionAgo(s.detik_lalu)'), '');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- server log ---\n' + log.split(/\r?\n/).slice(0, 8).join('\n'));
  process.exit(1);
}
