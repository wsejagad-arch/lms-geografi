// Self-test MCP browser: bicara JSON-RPC ke scripts/browser-mcp.mjs lalu uji tool utama.
// Jalankan: node scripts/browser-mcp-selftest.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

// server HTTP kecil untuk target uji (login + halaman dinamis + responsif)
const page = `<!doctype html><html><head><title>Uji Browser MCP</title>
<style>body{font-family:system-ui;margin:24px}.box{display:none}@media(max-width:600px){body{background:#eef}}</style></head>
<body>
<h1 id="judul">Halaman Uji</h1>
<form id="f"><input id="q" placeholder="cari"><button id="go" type="submit">Cari</button></form>
<p id="hasil"></p><div id="late" class="box">muncul belakangan</div>
<script>
document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  document.getElementById('hasil').textContent = 'hasil: ' + document.getElementById('q').value;
});
setTimeout(function () { document.getElementById('late').style.display = 'block'; }, 600);
console.log('halaman uji siap');
</script></body></html>`;

const httpServer = http.createServer((req, res) => {
  if (req.url === '/api/ok') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true })); }
  if (req.url === '/api/bad') { res.writeHead(500); return res.end('boom'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page);
});
await new Promise((r) => httpServer.listen(0, '127.0.0.1', r));
const port = httpServer.address().port;
const BASE = `http://127.0.0.1:${port}`;

// --- MCP client minimal ---
const mcp = spawn(process.execPath, ['scripts/browser-mcp.mjs'], {
  cwd: root,
  env: { ...process.env, BROWSER_PORT: String(Number(process.env.E2E_CDP_PORT || 9444)) },
  stdio: ['pipe', 'pipe', 'pipe'],
});
let buf = '';
const pending = new Map();
let nextId = 0;
mcp.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});
let errLog = '';
mcp.stderr.on('data', (d) => { errLog += d; });

function rpc(method, params) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout rpc ${method}`)); } }, 60000);
  });
}

function textOf(res) {
  const c = res?.result?.content?.[0]?.text;
  return typeof c === 'string' ? c : '';
}

async function call(name, args = {}) {
  const res = await rpc('tools/call', { name, arguments: args });
  const text = textOf(res);
  if (res?.result?.isError) throw new Error(`${name}: ${text}`);
  return text;
}

let shotPath = null;
try {
  const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'selftest', version: '1' } });
  check('MCP initialize', init?.result?.serverInfo?.name === 'browser-cdp', init?.result?.serverInfo?.name);

  const list = await rpc('tools/list', {});
  const tools = (list?.result?.tools || []).map((t) => t.name);
  check('tools/list lengkap', tools.length >= 14 && tools.includes('browser_click') && tools.includes('browser_screenshot'),
    `${tools.length} tool`);

  const started = JSON.parse(await call('browser_start', { headless: true, width: 1280, height: 900 }));
  check('browser_start', started.ok === true, JSON.stringify(started.viewport));

  const goto = JSON.parse(await call('browser_goto', { url: BASE, wait_ms: 200 }));
  check('browser_goto memuat halaman', goto.ok && /Uji Browser MCP/.test(goto.title || ''), `${goto.title} (${goto.url})`);

  const text = await call('browser_text', { selector: '#judul' });
  check('browser_text', text.trim() === 'Halaman Uji', text.trim());

  const fill = JSON.parse(await call('browser_fill', { selector: '#q', value: 'geografi' }));
  check('browser_fill mengisi input', fill.ok === true, JSON.stringify(fill));

  const click = JSON.parse(await call('browser_click', { selector: '#go' }));
  const hasil = await call('browser_text', { selector: '#hasil' });
  check('browser_click + event handler jalan', click.ok && hasil.includes('hasil: geografi'), hasil.trim());

  const waited = JSON.parse(await call('browser_wait', { selector: '#late', timeout_ms: 5000 }));
  check('browser_wait menunggu elemen muncul', waited.ok === true, `waited=${waited.waited_ms}ms`);

  const evalOut = await call('browser_eval', { js: '({ w: innerWidth, h: innerHeight, ua: navigator.userAgent.slice(0,20) })' });
  check('browser_eval mengembalikan JSON', /"w":\s*1280/.test(evalOut), evalOut.replace(/\s+/g, ' ').slice(0, 80));

  const vp = JSON.parse(await call('browser_viewport', { width: 390, height: 844, mobile: true }));
  const evalMobile = await call('browser_eval', { js: '({ w: innerWidth, mq: matchMedia("(max-width:600px)").matches })' });
  check('browser_viewport (responsif mobile)', vp.ok && /"w":\s*390/.test(evalMobile) && /"mq":\s*true/.test(evalMobile),
    evalMobile.replace(/\s+/g, ' ').slice(0, 80));

  const shot = JSON.parse(await call('browser_screenshot', { full_page: true }));
  shotPath = shot.path;
  check('browser_screenshot menyimpan PNG', shot.ok && fs.existsSync(shot.path) && shot.bytes > 1000, `${shot.bytes} bytes`);

  await call('browser_eval', { js: "fetch('/api/bad').catch(()=>{})" });
  await new Promise((r) => setTimeout(r, 500));
  const net = JSON.parse(await call('browser_network', { only_failed: true }));
  check('browser_network menangkap 500', Array.isArray(net) && net.some((n) => n.status === 500), JSON.stringify(net).slice(0, 90));

  const cons = JSON.parse(await call('browser_console', {}));
  check('browser_console menangkap log halaman', Array.isArray(cons) && cons.some((c) => /halaman uji siap/.test(c.text)),
    JSON.stringify(cons).slice(0, 90));

  const status = JSON.parse(await call('browser_status', {}));
  check('browser_status melaporkan proses hidup', status.running === true && !!status.pid, `pid=${status.pid}`);

  const closed = JSON.parse(await call('browser_close', {}));
  check('browser_close menutup browser', closed.closed === true, JSON.stringify(closed));
} catch (e) {
  check('self-test tanpa error', false, e.message);
} finally {
  try { mcp.kill(); } catch { /* ignore */ }
  httpServer.close();
  if (shotPath && fs.existsSync(shotPath)) fs.rmSync(shotPath, { force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- stderr ---\n' + errLog.split(/\r?\n/).slice(0, 10).join('\n'));
  process.exit(1);
}
