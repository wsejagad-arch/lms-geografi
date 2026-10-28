// Smoke test: boot server, uji API + export client. Jalankan: node scripts/smoke-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.SMOKE_PORT || 3995);
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
let cookie = '';

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

async function req(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

async function waitReady(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await fetch(BASE + '/api/me');
      if (r.status === 401 || r.status === 200) return true;
    } catch { /* belum listen */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

try {
  check('server ready', await waitReady(), BASE);

  const login = await req('POST', '/api/login', { email: 'admin@lms.id', password: 'admin' });
  const loginUser = login.json && login.json.user ? login.json.user : login.json;
  check('POST /api/login', login.status === 200 && loginUser && (loginUser.id || loginUser.email),
    `status=${login.status} user=${loginUser && (loginUser.email || loginUser.id) || 'none'}`);

  const dash = await req('GET', '/api/dashboard');
  const dashKeys = dash.json && typeof dash.json === 'object' ? Object.keys(dash.json) : [];
  check('GET /api/dashboard', dash.status === 200 && dashKeys.includes('siswa'), `keys=${dashKeys.slice(0, 4).join(',')}`);

  const seed = await req('POST', '/api/seed');
  const seedOk = seed.status === 200 && seed.json && (seed.json.success === true || seed.json.message === 'Data already exists');
  check('POST /api/seed berfungsi (bukan 404/500)', seedOk, `status=${seed.status} body=${seed.text.slice(0, 40)}`);

  const lists = ['/api/tenants', '/api/subjects', '/api/classes', '/api/students',
    '/api/materials', '/api/questions', '/api/exams', '/api/grades',
    '/api/attendance', '/api/assignments', '/api/schedules'];
  const bad = [];
  for (const p of lists) {
    const r = await req('GET', p);
    if (r.status !== 200) bad.push(`${p}=${r.status}`);
  }
  check('11 endpoint list balik 200', bad.length === 0, bad.join(' ') || 'all 200');

  const missing = await req('POST', '/api/__tidak_ada__');
  check('route tak dikenal tetap 404', missing.status === 404, `status=${missing.status}`);
} finally {
  server.kill();
}

// ---- uji export client LMS tanpa browser ----
try {
  const src = fs.readFileSync(path.join(root, 'public/assets/js/api.js'), 'utf8');
  const sandbox = { fetch: async () => ({ ok: true, json: async () => ({}) }), URLSearchParams, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${src}\n;globalThis.__LMS = LMS;`, sandbox);
  const LMS = sandbox.__LMS;
  const expect = ['createAttendance', 'deleteAttendance', 'createAssignment', 'updateAssignment',
    'deleteAssignment', 'getSchedules', 'createSchedule', 'updateSchedule', 'deleteSchedule',
    'studentLogin', 'getDashboard', 'seedData'];
  const missingFns = expect.filter((k) => typeof LMS[k] !== 'function');
  check('export LMS lengkap', missingFns.length === 0, missingFns.join(',') || `${expect.length} fungsi OK`);
} catch (e) {
  check('export LMS lengkap', false, e.message);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- server log ---\n' + serverLog.split(/\r?\n/).slice(0, 15).join('\n'));
  process.exit(1);
}
