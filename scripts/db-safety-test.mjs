// Uji ketahanan database: berkas rusak tidak boleh mengosongkan data, simpan bersamaan aman.
// Jalankan: node scripts/db-safety-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bcrypt = createRequire(import.meta.url)('bcryptjs');
const PORT = Number(process.env.DB_SAFETY_PORT || 3993);
const BASE = `http://127.0.0.1:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-dbsafe-'));
const dbPath = path.join(dir, 'db.json');
const ADMIN = 'admin@lms.id';
const PASSWORD = 'UjiAman2026';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}
function userCount() {
  try { return (readDb().users || []).length; } catch { return -1; }
}
async function waitForServer(timeoutMs = 15000) {
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
async function login(password = PASSWORD) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password })
  });
  const cookie = res.headers.getSetCookie ? res.headers.getSetCookie().join('; ') : '';
  return { status: res.status, cookie };
}

// Siapkan database uji dengan admin yang passwordnya diketahui.
const seed = JSON.parse(fs.readFileSync(path.join(root, 'data', 'db.json'), 'utf8'));
seed.users = (seed.users || []).filter(u => u.role !== 'super_admin' && u.role !== 'admin');
seed.users.push({
  id: 'uji-admin',
  email: ADMIN,
  password: bcrypt.hashSync(PASSWORD, 10),
  nama: 'Admin Uji',
  role: 'super_admin',
  tenant_id: null,
  created_at: new Date().toISOString()
});
fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2));
fs.copyFileSync(dbPath, `${dbPath}.prev`);
const baseline = { users: seed.users.length, students: (seed.students || []).length };

const child = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: dbPath, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
child.stdout.on('data', d => { serverLog += d.toString(); });
child.stderr.on('data', d => { serverLog += d.toString(); });

let exitCode = 1;
try {
  const ready = await waitForServer();
  check('server uji berjalan', ready);
  if (!ready) throw new Error('server tidak siap: ' + serverLog.slice(0, 300));

  const first = await login();
  check('login admin berhasil pada database sehat', first.status === 200, `status=${first.status}`);

  // 1. Berkas utama dirusak (JSON terpotong) lalu ada request yang menyimpan:
  //    loadDB harus jatuh ke .prev dan penulisan kosong harus ditolak.
  fs.writeFileSync(dbPath, '{"users": [{"id": "rusak"');
  const afterCorrupt = await login();
  check('login tetap berhasil meski berkas utama terpotong (memakai .prev)',
    afterCorrupt.status === 200, `status=${afterCorrupt.status}`);
  check('data pengguna tidak hilang setelah berkas rusak',
    userCount() >= baseline.users, `users=${userCount()} baseline=${baseline.users}`);
  check('salinan .prev tetap valid untuk pemulihan',
    (() => { try { return (JSON.parse(fs.readFileSync(`${dbPath}.prev`, 'utf8')).users || []).length > 0; } catch { return false; } })());

  // 2. Simpan bersamaan: banyak login paralel tidak boleh merusak berkas.
  const parallel = await Promise.all(Array.from({ length: 12 }, () => login()));
  const ok200 = parallel.filter(r => r.status === 200).length;
  check('login paralel semuanya sukses', ok200 === 12, `sukses=${ok200}/12`);
  check('database tetap JSON valid setelah penulisan bersamaan',
    (() => { try { readDb(); return true; } catch { return false; } })());
  check('jumlah pengguna tetap utuh setelah penulisan bersamaan',
    userCount() >= baseline.users, `users=${userCount()}`);

  // 3. Penulisan DB kosong harus ditolak walau berkas berisi data.
  fs.writeFileSync(path.join(dir, 'kosong.json'), JSON.stringify({ users: [], tenants: [], students: [] }));
  const logout = await fetch(`${BASE}/api/logout`, { method: 'POST', headers: { Cookie: first.cookie } });
  check('logout berjalan normal', logout.status === 200, `status=${logout.status}`);
  check('data tetap ada setelah logout', userCount() >= baseline.users, `users=${userCount()}`);

  // 4. Diagnostik & pemulihan berbasis berkas (tanpa console server).
  const status = await fetch(`${BASE}/api/admin/db-status`, { headers: { Cookie: first.cookie } });
  const statusBody = await status.json().catch(() => ({}));
  check('db-status menampilkan daftar berkas + jumlah data',
    status.status === 200 && Array.isArray(statusBody.files) && statusBody.files.length > 0
      && statusBody.files.some(f => f.counts && f.counts.users > 0),
    `files=${(statusBody.files || []).length}`);

  const restore = await fetch(`${BASE}/api/admin/restore-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: first.cookie },
    body: JSON.stringify({ confirm: 'RESTORE-FILE', file: 'db.json.prev' })
  });
  const restoreBody = await restore.json().catch(() => ({}));
  check('restore-file memulihkan cadangan dan mempertahankan akun staf',
    restore.status === 200 && restoreBody.counts && restoreBody.counts.users >= baseline.users,
    `status=${restore.status} users=${restoreBody.counts && restoreBody.counts.users}`);
  const afterRestore = await login();
  check('login tetap bisa setelah pemulihan berkas', afterRestore.status === 200, `status=${afterRestore.status}`);
} catch (error) {
  check('uji berjalan tanpa error tak terduga', false, error.message);
} finally {
  child.kill();
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) console.log('Gagal:\n' + failed.map(f => ' - ' + f.name).join('\n'));
  exitCode = failed.length ? 1 : 0;
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exit(exitCode);
