#!/usr/bin/env node
// MCP stdio adapter untuk Hermes Agent API (OpenAI-compatible /v1).
// Env: HERMES_BASE_URL (default http://127.0.0.1:8642/v1), HERMES_API_KEY, HERMES_MODEL (default "default").

const BASE = (process.env.HERMES_BASE_URL || 'http://127.0.0.1:8642/v1').replace(/\/+$/, '');
const KEY = process.env.HERMES_API_KEY || '';
const MODEL = process.env.HERMES_MODEL || 'default';
const TIMEOUT_MS = Number(process.env.HERMES_TIMEOUT_MS || 120000);

const TOOLS = [
  {
    name: 'hermes_list_models',
    description: 'Daftar model yang tersedia di server Hermes.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'hermes_chat',
    description: 'Kirim prompt ke model Hermes dan kembalikan jawabannya.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Pesan pengguna' },
        system: { type: 'string', description: 'System prompt (opsional)' },
        model: { type: 'string', description: 'Nama model (opsional)' },
        temperature: { type: 'number', description: 'Suhu sampling (opsional)' }
      },
      required: ['prompt'],
      additionalProperties: false
    }
  }
];

async function callApi(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, {
      ...options,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(KEY ? { authorization: `Bearer ${KEY}` } : {}),
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    try { return JSON.parse(text); } catch { return text; }
  } finally {
    clearTimeout(timer);
  }
}

async function runTool(name, args) {
  if (name === 'hermes_list_models') {
    const data = await callApi('/models');
    const ids = Array.isArray(data?.data) ? data.data.map(m => m.id) : [];
    return ids.length ? ids.join('\n') : JSON.stringify(data).slice(0, 500);
  }
  if (name === 'hermes_chat') {
    const messages = [];
    if (args.system) messages.push({ role: 'system', content: args.system });
    messages.push({ role: 'user', content: String(args.prompt || '') });
    const body = { model: args.model || MODEL, messages, stream: false };
    if (typeof args.temperature === 'number') body.temperature = args.temperature;
    const data = await callApi('/chat/completions', { method: 'POST', body: JSON.stringify(body) });
    const msg = data?.choices?.[0]?.message?.content;
    return typeof msg === 'string' ? msg : JSON.stringify(data).slice(0, 2000);
  }
  throw new Error(`Tool tidak dikenal: ${name}`);
}

function send(payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return send({ jsonrpc: '2.0', id, result: {
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'hermes-agent', version: '1.0.0' }
    } });
  }
  if (method === 'notifications/initialized') return;
  if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
  if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};
    runTool(name, args)
      .then(text => send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } }))
      .catch(err => send({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: String(err.message || err) }] } }));
    return;
  }
  if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method tidak didukung: ${method}` } });
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); } catch (err) { /* abaikan baris tidak valid */ }
  }
});
process.stdin.on('end', () => process.exit(0));
