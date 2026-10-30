// Server chat lokal untuk Ollama. Tanpa dependensi npm.
// Jalankan: npm run chat   (default http://127.0.0.1:4321)
//
// Env:
//   OLLAMA_BASE  base URL Ollama (default http://127.0.0.1:11435)
//   CHAT_PORT    port UI chat   (default 4321)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA_BASE = (process.env.OLLAMA_BASE || 'http://127.0.0.1:11435').replace(/\/+$/, '');
const PORT = Number(process.env.CHAT_PORT || 4321);

function json(res, code, payload) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}

async function readBody(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Body terlalu besar');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function proxyChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (err) {
    return json(res, 400, { error: err.message || 'Body tidak valid' });
  }

  let upstream;
  try {
    upstream = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages || [],
        stream: true,
        options: {
          temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.3,
          num_ctx: Number(payload.num_ctx || 4096),
        },
      }),
    });
  } catch (err) {
    return json(res, 502, { error: `Ollama tidak terjangkau di ${OLLAMA_BASE}: ${err.message}` });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return json(res, 502, { error: `Ollama HTTP ${upstream.status}: ${text.slice(0, 300)}` });
  }

  res.writeHead(200, {
    'content-type': 'application/x-ndjson; charset=utf-8',
    'cache-control': 'no-store',
    'x-accel-buffering': 'no',
  });
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch {
    // Klien memutus koneksi; biarkan selesai.
  } finally {
    res.end();
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const html = fs.readFileSync(path.join(here, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(html);
  }

  if (req.method === 'GET' && url.pathname === '/api/info') {
    try {
      const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
      const data = await r.json();
      const models = (data.models || []).map((m) => ({ name: m.name, size: m.size }));
      return json(res, 200, { base: OLLAMA_BASE, models });
    } catch (err) {
      return json(res, 200, { base: OLLAMA_BASE, models: [], error: err.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') return proxyChat(req, res);

  json(res, 404, { error: 'Tidak ditemukan' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Chat Ollama: http://127.0.0.1:${PORT}  (upstream ${OLLAMA_BASE})`);
});
