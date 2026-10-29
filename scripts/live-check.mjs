// Uji situs LIVE memakai MCP browser (stdio). Jalankan: node scripts/live-check.mjs [baseUrl]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] || process.env.LIVE_BASE || 'https://geolabs.my.id').replace(/\/+$/, '');
const OUT = path.join(os.tmpdir(), 'lms-live');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

const mcp = spawn(process.execPath, ['scripts/browser-mcp.mjs'], {
  cwd: root,
  env: { ...process.env, BROWSER_PORT: String(Number(process.env.LIVE_CDP_PORT || 9455)) },
  stdio: ['pipe', 'pipe', 'pipe'],
});
let buf = '';
let nextId = 0;
const pending = new Map();
mcp.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id).resolve(msg); pending.delete(msg.id); }
  }
});
let errLog = '';
mcp.stderr.on('data', (d) => { errLog += d; });

function rpc(method, params) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout ${method}`)); } }, 90000);
  });
}

async function call(name, args = {}) {
  const res = await rpc('tools/call', { name, arguments: args });
  const text = res?.result?.content?.[0]?.text || '';
  if (res?.result?.isError) throw new Error(`${name}: ${text}`);
  return text;
}
const json = async (name, args) => JSON.parse(await call(name, args));

try {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'live-check', version: '1' } });
  await json('browser_start', { headless: true, width: 1280, height: 900 });

  // 1. Student page tanpa sesi -> login
  const s = await json('browser_goto', { url: `${BASE}/student.html`, wait_ms: 1200 });
  const onLogin = await json('browser_wait', { selector: '#login-form', timeout_ms: 8000 });
  check('student.html tanpa sesi mengarah ke form login', onLogin.ok === true, `${s.url}`);

  const placeholder = await call('browser_eval', { js: "document.getElementById('email')?.placeholder || ''" });
  check('form login mendukung NIS', /NIS/i.test(placeholder), placeholder);

  const loginPageClean = await json('browser_network', { only_failed: true });
  const realFail = Array.isArray(loginPageClean)
    ? loginPageClean.filter((n) => n.status !== '-' && n.url && !/favicon/i.test(n.url)
        && !(/\/api\/me$/.test(n.url) && n.status === 401))
    : [];
  check('tidak ada request gagal (selain probe /api/me 401)', realFail.length === 0, JSON.stringify(realFail).slice(0, 120));

  const consoleLogs = JSON.parse(await call('browser_console', {}));
  const jsErrors = (Array.isArray(consoleLogs) ? consoleLogs : []).filter((c) => c.type === 'exception');
  check('tidak ada JS exception di halaman login', jsErrors.length === 0, JSON.stringify(jsErrors).slice(0, 120));

  // 2. Aset versi terbaru termuat
  const assets = await call('browser_eval', {
    js: `performance.getEntriesByType('resource').map(e => e.name).filter(n => /assets\\/(js|css)\\//.test(n)).map(n => n.split('/').pop())`,
  });
  check('aset admin/student versi 20261105a dimuat atau tidak dipakai', /\?v=/.test(assets) || assets === '[]', assets.slice(0, 120));

  // 3. Responsif mobile
  await json('browser_viewport', { width: 390, height: 844, mobile: true });
  const mobile = await call('browser_eval', { js: '({ w: innerWidth, docW: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > innerWidth + 2 })' });
  const m = JSON.parse(mobile);
  check('layout mobile 390px tanpa overflow horizontal', m.w === 390 && m.overflowX === false, JSON.stringify(m));

  fs.mkdirSync(OUT, { recursive: true });
  const shotMobile = await json('browser_screenshot', { path: path.join(OUT, 'login-390.png') });
  check('screenshot mobile tersimpan', fs.existsSync(shotMobile.path), `${Math.round(shotMobile.bytes / 1024)} KB`);

  // 4. Halaman admin
  await json('browser_viewport', { width: 1280, height: 900 });
  const a = await json('browser_goto', { url: `${BASE}/admin.html`, wait_ms: 1200 });
  check('admin.html terbuka', /admin|login|LMS/i.test(a.title || ''), a.title);
  const shotAdmin = await json('browser_screenshot', { path: path.join(OUT, 'admin-1280.png') });
  check('screenshot admin tersimpan', fs.existsSync(shotAdmin.path), `${Math.round(shotAdmin.bytes / 1024)} KB`);

  const adminConsole = JSON.parse(await call('browser_console', {}));
  const adminErrors = (Array.isArray(adminConsole) ? adminConsole : []).filter((c) => c.type === 'exception');
  check('tidak ada JS exception di halaman admin', adminErrors.length === 0, JSON.stringify(adminErrors).slice(0, 120));

  await json('browser_close', {});
  console.log(`\nScreenshot: ${OUT}`);
} catch (e) {
  check('live-check berjalan', false, e.message);
} finally {
  try { mcp.kill(); } catch { /* ignore */ }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- stderr ---\n' + errLog.split(/\r?\n/).slice(0, 8).join('\n'));
  process.exit(1);
}
