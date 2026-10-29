#!/usr/bin/env node
// MCP stdio server: browser automation ringan lewat Chrome DevTools Protocol.
// Tanpa dependensi npm (pakai global fetch + WebSocket Node >= 22 dan Chrome/Edge lokal).
// Env:
//   BROWSER_HEADLESS=1|0      (default 1)
//   BROWSER_PORT=9333         (port remote debugging)
//   BROWSER_TIMEOUT_MS=20000  (timeout per aksi)
//   BROWSER_EXECUTABLE=path   (override chrome/edge)

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HEADLESS = process.env.BROWSER_HEADLESS !== '0';
const CDP_PORT = Number(process.env.BROWSER_PORT || 9333);
const TIMEOUT_MS = Number(process.env.BROWSER_TIMEOUT_MS || 20000);

const CHROME_CANDIDATES = [
  process.env.BROWSER_EXECUTABLE,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const TOOLS = [
  {
    name: 'browser_start',
    description: 'Jalankan Chrome/Edge (headless default) dan sambungkan CDP. Aman dipanggil berkali-kali.',
    inputSchema: {
      type: 'object',
      properties: {
        headless: { type: 'boolean', description: 'false = tampilkan jendela browser' },
        width: { type: 'number', description: 'Lebar viewport (default 1280)' },
        height: { type: 'number', description: 'Tinggi viewport (default 900)' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'browser_goto',
    description: 'Buka URL dan tunggu halaman selesai dimuat. Mengembalikan url, title, dan status.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        wait_ms: { type: 'number', description: 'Tambahan tunggu setelah load (default 300)' }
      },
      required: ['url'],
      additionalProperties: false
    }
  },
  {
    name: 'browser_eval',
    description: 'Jalankan JavaScript di halaman aktif dan kembalikan hasilnya (JSON).',
    inputSchema: {
      type: 'object',
      properties: {
        js: { type: 'string' },
        await_promise: { type: 'boolean', description: 'default true' }
      },
      required: ['js'],
      additionalProperties: false
    }
  },
  {
    name: 'browser_click',
    description: 'Klik elemen berdasarkan selector CSS (opsional index bila banyak).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        index: { type: 'number', description: 'default 0' },
        wait_ms: { type: 'number', description: 'Tunggu setelah klik (default 250)' }
      },
      required: ['selector'],
      additionalProperties: false
    }
  },
  {
    name: 'browser_fill',
    description: 'Isi nilai input/textarea/select lalu kirim event input+change. Bisa sekalian submit form.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        value: { type: 'string' },
        submit: { type: 'boolean', description: 'Kirim form terdekat setelah mengisi' },
        wait_ms: { type: 'number' }
      },
      required: ['selector', 'value'],
      additionalProperties: false
    }
  },
  {
    name: 'browser_wait',
    description: 'Tunggu sampai selector muncul, atau ekspresi JS bernilai truthy.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        js: { type: 'string' },
        timeout_ms: { type: 'number', description: `default ${TIMEOUT_MS}` }
      },
      additionalProperties: false
    }
  },
  {
    name: 'browser_text',
    description: 'Ambil innerText elemen (default body) — berguna untuk asersi teks.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        limit: { type: 'number', description: 'default 4000 karakter' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'browser_html',
    description: 'Ambil outerHTML elemen (default body).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        limit: { type: 'number', description: 'default 6000 karakter' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'browser_screenshot',
    description: 'Simpan screenshot PNG. Kembalikan path file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'default: %TEMP%/browser-shot-<ts>.png' },
        full_page: { type: 'boolean', description: 'default true' },
        selector: { type: 'string', description: 'Potong hanya elemen ini' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'browser_viewport',
    description: 'Ubah ukuran viewport / mode mobile untuk uji responsif.',
    inputSchema: {
      type: 'object',
      properties: {
        width: { type: 'number' },
        height: { type: 'number' },
        mobile: { type: 'boolean' },
        device_scale: { type: 'number' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'browser_console',
    description: 'Lihat pesan console & error halaman yang tertangkap.',
    inputSchema: {
      type: 'object',
      properties: { clear: { type: 'boolean' } },
      additionalProperties: false
    }
  },
  {
    name: 'browser_network',
    description: 'Lihat request jaringan (status >= 400 atau semua) yang tertangkap.',
    inputSchema: {
      type: 'object',
      properties: {
        only_failed: { type: 'boolean', description: 'default true' },
        clear: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'browser_status',
    description: 'Status browser: pid, url aktif, judul, jumlah console log/network.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'browser_close',
    description: 'Tutup browser dan bersihkan profil sementara.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
];

// ===== CDP =====
const state = {
  proc: null,
  ws: null,
  cdp: null,
  profile: null,
  viewport: { width: 1280, height: 900 },
  logs: [],
  net: [],
  msgId: 0,
  pending: new Map(),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
  const found = CHROME_CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
  if (!found) throw new Error('Chrome/Edge tidak ditemukan. Set BROWSER_EXECUTABLE.');
  return found;
}

async function waitCdp(timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch { /* belum siap */ }
    await sleep(200);
  }
  throw new Error('CDP tidak siap (timeout)');
}

async function ensureBrowser(opts = {}) {
  if (state.cdp && state.ws && state.ws.readyState === 1) return;
  const headless = opts.headless === undefined ? HEADLESS : !!opts.headless;
  const width = Number(opts.width || state.viewport.width);
  const height = Number(opts.height || state.viewport.height);
  state.profile = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-mcp-'));
  const exe = findBrowser();
  const args = [
    headless ? '--headless=new' : '--new-window',
    '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--mute-audio',
    `--window-size=${width},${height}`,
    `--user-data-dir=${state.profile}`,
    `--remote-debugging-port=${CDP_PORT}`,
    'about:blank',
  ];
  state.proc = spawn(exe, args, { stdio: 'ignore' });
  await waitCdp();

  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', (e) => reject(new Error('WS error: ' + (e.message || 'unknown'))), { once: true });
  });
  state.ws = ws;
  state.cdp = true;
  ws.addEventListener('message', onMessage);
  ws.addEventListener('close', () => { state.cdp = null; });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
}

function onMessage(ev) {
  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }
  if (msg.id && state.pending.has(msg.id)) {
    const { resolve, reject } = state.pending.get(msg.id);
    state.pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || []).map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type)).join(' ');
    state.logs.push({ type: msg.params.type, text: text.slice(0, 500) });
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails || {};
    state.logs.push({ type: 'exception', text: String(d.exception?.description || d.text || '').slice(0, 500) });
  } else if (msg.method === 'Log.entryAdded') {
    state.logs.push({ type: msg.params.entry.level, text: String(msg.params.entry.text || '').slice(0, 500) });
  } else if (msg.method === 'Network.responseReceived') {
    const r = msg.params.response || {};
    state.net.push({ status: r.status, url: String(r.url || '').slice(0, 300), type: msg.params.type });
  } else if (msg.method === 'Network.loadingFailed') {
    state.net.push({ status: 0, url: String(msg.params.requestId || ''), type: 'failed', error: msg.params.errorText });
  }
}

function send(method, params = {}, timeout = TIMEOUT_MS) {
  if (!state.ws || state.ws.readyState !== 1) return Promise.reject(new Error('Browser belum jalan. Panggil browser_start.'));
  const id = ++state.msgId;
  return new Promise((resolve, reject) => {
    state.pending.set(id, { resolve, reject });
    state.ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (state.pending.has(id)) { state.pending.delete(id); reject(new Error(`Timeout CDP ${method}`)); }
    }, timeout);
  });
}

async function evalJs(expression, awaitPromise = true) {
  const r = await send('Runtime.evaluate', {
    expression, awaitPromise, returnByValue: true, userGesture: true,
  });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error(String(d.exception?.description || d.text || 'JS error').slice(0, 600));
  }
  const v = r.result?.value;
  return v === undefined ? null : v;
}

async function currentInfo() {
  try {
    return await evalJs('({ url: location.href, title: document.title, ready: document.readyState })', false);
  } catch { return { url: null, title: null, ready: null }; }
}

// ===== TOOLS =====
async function runTool(name, args = {}) {
  if (name === 'browser_start') {
    await ensureBrowser(args);
    await send('Emulation.setDeviceMetricsOverride', {
      width: state.viewport.width, height: state.viewport.height, deviceScaleFactor: 1, mobile: false,
    });
    return JSON.stringify({ ok: true, headless: args.headless === undefined ? HEADLESS : !!args.headless, viewport: state.viewport });
  }

  if (name === 'browser_status') {
    if (!state.cdp) return JSON.stringify({ running: false });
    const info = await currentInfo();
    return JSON.stringify({
      running: true, pid: state.proc?.pid || null, viewport: state.viewport,
      url: info.url, title: info.title, console_entries: state.logs.length, network_entries: state.net.length,
    }, null, 2);
  }

  if (name === 'browser_close') {
    try { state.ws?.close(); } catch { /* ignore */ }
    try { state.proc?.kill(); } catch { /* ignore */ }
    const profile = state.profile;
    state.proc = null; state.ws = null; state.cdp = null; state.logs = []; state.net = [];
    if (profile) {
      try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* terkunci */ }
    }
    state.profile = null;
    return JSON.stringify({ ok: true, closed: true });
  }

  // semua tool lain memastikan browser hidup
  await ensureBrowser();

  if (name === 'browser_goto') {
    const url = String(args.url || '');
    if (!url) throw new Error('url wajib');
    await send('Page.navigate', { url });
    await sleep(Number(args.wait_ms ?? 600));
    // tunggu sampai DOM siap
    for (let i = 0; i < 40; i++) {
      const ready = await evalJs('document.readyState', false).catch(() => null);
      if (ready === 'complete' || ready === 'interactive') break;
      await sleep(150);
    }
    const info = await currentInfo();
    return JSON.stringify({ ok: true, ...info }, null, 2);
  }

  if (name === 'browser_eval') {
    const out = await evalJs(String(args.js || ''), args.await_promise !== false);
    return typeof out === 'string' ? out : JSON.stringify(out, null, 2);
  }

  if (name === 'browser_click') {
    const idx = Number(args.index || 0);
    const out = await evalJs(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(String(args.selector || ''))})];
      const el = els[${idx}];
      if (!el) return { ok: false, found: els.length };
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.click();
      return { ok: true, found: els.length, tag: el.tagName, text: (el.innerText || '').slice(0, 80) };
    })()`);
    await sleep(Number(args.wait_ms ?? 250));
    return JSON.stringify(out);
  }

  if (name === 'browser_fill') {
    const sel = String(args.selector || '');
    const val = String(args.value ?? '');
    const out = await evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      if (!el) return { ok: false, found: 0 };
      el.focus();
      if (el.tagName === 'SELECT') el.value = ${JSON.stringify(val)};
      else el.value = ${JSON.stringify(val)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      let submitted = false;
      if (${args.submit ? 'true' : 'false'}) {
        const form = el.form || el.closest('form');
        if (form) {
          if (typeof form.requestSubmit === 'function') form.requestSubmit();
          else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          submitted = true;
        }
      }
      return { ok: true, tag: el.tagName, submitted };
    })()`);
    await sleep(Number(args.wait_ms ?? 300));
    return JSON.stringify(out);
  }

  if (name === 'browser_wait') {
    const timeout = Number(args.timeout_ms || TIMEOUT_MS);
    const started = Date.now();
    const expr = args.js
      ? `Boolean(${String(args.js)})`
      : `Boolean(document.querySelector(${JSON.stringify(String(args.selector || ''))}))`;
    while (Date.now() - started < timeout) {
      const ok = await evalJs(expr, false).catch(() => false);
      if (ok) return JSON.stringify({ ok: true, waited_ms: Date.now() - started });
      await sleep(200);
    }
    return JSON.stringify({ ok: false, waited_ms: Date.now() - started, timeout_ms: timeout });
  }

  if (name === 'browser_text') {
    const limit = Number(args.limit || 4000);
    const text = await evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(args.selector || 'body')}) || document.body;
      return el ? el.innerText : '';
    })()`, false);
    return String(text || '').slice(0, limit);
  }

  if (name === 'browser_html') {
    const limit = Number(args.limit || 6000);
    const html = await evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(args.selector || 'body')}) || document.body;
      return el ? el.outerHTML : '';
    })()`, false);
    return String(html || '').slice(0, limit);
  }

  if (name === 'browser_screenshot') {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = args.path || path.join(os.tmpdir(), `browser-shot-${ts}.png`);
    const params = { format: 'png' };
    if (args.full_page !== false) params.captureBeyondViewport = true;
    if (args.selector) {
      const box = await evalJs(`(() => {
        const el = document.querySelector(${JSON.stringify(String(args.selector))});
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.max(1, r.width), height: Math.max(1, r.height) };
      })()`);
      if (box) params.clip = { ...box, scale: 1 };
    }
    const { data } = await send('Page.captureScreenshot', params, 30000);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    const size = fs.statSync(outPath).size;
    return JSON.stringify({ ok: true, path: outPath, bytes: size });
  }

  if (name === 'browser_viewport') {
    state.viewport = {
      width: Number(args.width || state.viewport.width),
      height: Number(args.height || state.viewport.height),
    };
    const metrics = {
      width: state.viewport.width,
      height: state.viewport.height,
      deviceScaleFactor: Number(args.device_scale || 1),
      mobile: !!args.mobile,
    };
    await send('Emulation.setDeviceMetricsOverride', metrics);
    if (args.mobile) {
      // Tanpa meta viewport, Chrome memakai layout 980px. Sisipkan bila belum ada.
      await evalJs(`(() => {
        let m = document.querySelector('meta[name=viewport]');
        if (!m) {
          m = document.createElement('meta');
          m.name = 'viewport';
          document.head.appendChild(m);
        }
        if (!/width\\s*=/.test(m.content || '')) m.content = 'width=device-width, initial-scale=1';
        return true;
      })()`, false).catch(() => {});
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {});
      await send('Emulation.setDeviceMetricsOverride', metrics);
      await sleep(120);
    } else {
      await send('Emulation.setTouchEmulationEnabled', { enabled: false }).catch(() => {});
    }
    const info = await evalJs('({ w: innerWidth, h: innerHeight })', false).catch(() => null);
    return JSON.stringify({ ok: true, viewport: state.viewport, mobile: !!args.mobile, inner: info });
  }

  if (name === 'browser_console') {
    const out = state.logs.slice(-100);
    if (args.clear) state.logs = [];
    return JSON.stringify(out.length ? out : [{ type: 'info', text: '(tidak ada log)' }], null, 2);
  }

  if (name === 'browser_network') {
    const onlyFailed = args.only_failed !== false;
    const rows = (onlyFailed ? state.net.filter((n) => n.status === 0 || n.status >= 400) : state.net).slice(-100);
    if (args.clear) state.net = [];
    return JSON.stringify(rows.length ? rows : [{ status: '-', url: '(tidak ada)' }], null, 2);
  }

  throw new Error(`Tool tidak dikenal: ${name}`);
}

// ===== MCP stdio =====
function sendMsg(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return sendMsg({ jsonrpc: '2.0', id, result: {
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'browser-cdp', version: '1.0.0' },
    } });
  }
  if (method === 'notifications/initialized') return;
  if (method === 'ping') return sendMsg({ jsonrpc: '2.0', id, result: {} });
  if (method === 'tools/list') return sendMsg({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};
    runTool(name, args)
      .then((text) => sendMsg({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } }))
      .catch((err) => sendMsg({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: String(err?.message || err) }] } }));
    return;
  }
  if (id !== undefined) sendMsg({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method tidak didukung: ${method}` } });
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); } catch { /* baris tidak valid */ }
  }
});

function shutdown() {
  try { state.ws?.close(); } catch { /* ignore */ }
  try { state.proc?.kill(); } catch { /* ignore */ }
  if (state.profile) { try { fs.rmSync(state.profile, { recursive: true, force: true }); } catch { /* ignore */ } }
  process.exit(0);
}
process.stdin.on('end', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
