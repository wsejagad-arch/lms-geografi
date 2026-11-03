#!/usr/bin/env node
// ctx.mjs â€” alat hemat token: digest repo, cari terbatas, baca potongan, tulis handoff.
// Pemakaian:
//   node scripts/ctx.mjs digest [--json]
//   node scripts/ctx.mjs map <pola> [--max 40] [--ext js,html]
//   node scripts/ctx.mjs read <file> [start] [end]
//   node scripts/ctx.mjs size [--top 15]
//   node scripts/ctx.mjs handoff --title "..." [--status "..."] [--next "..."] [--file ".context/handoff.md"]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SKIP_DIR = new Set(['node_modules', '.git', '.context', 'dist', 'build', 'coverage', 'edge-profile', 'whatsapp-sessions', 'data', 'vendor', 'target', '__pycache__', '.venv', 'venv', 'bin', 'obj']);
const SKIP_FILE = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.woff', '.woff2', '.ttf', '.sqlite', '.db']);
const CODE_EXT = /\.(mjs|cjs|js|jsx|ts|tsx|json|md|css|html|sh|ps1|py|go|rs|java|kt|php|rb|cs|cpp|c|h|sql|ya?ml|toml)$/i;
const tok = (s) => Math.ceil(String(s).length / 4);

function emit(text) {
  const budget = Number(process.env.CTX_BUDGET || 2500);
  const limit = budget * 4;
  if (text.length <= limit) { console.log(text); return; }
  const cut = text.slice(0, limit);
  const done = cut.slice(0, Math.max(0, cut.lastIndexOf('\n')));
  console.log(`${done}\n[dipotong ~${budget} tok; perkecil --max atau sempitkan rentang]`);
}

function walk(dir, acc = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name)) walk(path.join(dir, e.name), acc);
      continue;
    }
    if (!CODE_EXT.test(e.name) || SKIP_FILE.has(e.name) || /\.min\.(js|css)$/i.test(e.name)) continue;
    const full = path.join(dir, e.name);
    let size = 0;
    try { size = fs.statSync(full).size; } catch { continue; }
    if (size > 1_500_000) continue;
    acc.push({ rel: path.relative(ROOT, full).replace(/\\/g, '/'), size, tokens: Math.ceil(size / 4) });
  }
  return acc;
}

function files() {
  return walk(ROOT).filter((f) => !SKIP_EXT.has(path.extname(f.rel).toLowerCase()));
}

function digest(json) {
  const list = files();
  const byDir = new Map();
  for (const f of list) {
    const dir = f.rel.includes('/') ? f.rel.split('/')[0] : '(root)';
    const cur = byDir.get(dir) || { files: 0, tokens: 0 };
    cur.files += 1;
    cur.tokens += f.tokens;
    byDir.set(dir, cur);
  }
  const biggest = [...list].sort((a, b) => b.tokens - a.tokens).slice(0, 8);
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')); } catch { /* noop */ }
  const routes = [];
  const serverFile = path.join(ROOT, 'server.js');
  if (fs.existsSync(serverFile)) {
    const src = fs.readFileSync(serverFile, 'utf8');
    for (const m of src.matchAll(/app\.(get|post|put|delete|patch)\('([^']+)'/g)) routes.push(`${m[1].toUpperCase()} ${m[2]}`);
  }
  const total = list.reduce((s, f) => s + f.tokens, 0);
  const data = {
    files: list.length,
    estTokens: total,
    dirs: [...byDir.entries()].map(([dir, v]) => ({ dir, ...v })).sort((a, b) => b.tokens - a.tokens),
    biggest,
    scripts: pkg.scripts || {},
    routes: routes.length,
    routeSample: routes.slice(0, 25)
  };
  if (json) { console.log(JSON.stringify(data)); return; }
  const out = [];
  out.push(`# Digest repo (${data.files} berkas, ~${total} token)`);
  out.push('');
  out.push('## Ukuran per direktori');
  for (const d of data.dirs.slice(0, 8)) out.push(`- ${d.dir}: ${d.files} file, ~${d.tokens} tok`);
  out.push('');
  out.push('## Berkas terbesar (jangan dibaca penuh)');
  for (const f of biggest) out.push(`- ${f.rel}: ~${f.tokens} tok`);
  out.push('');
  out.push(`## Skrip npm: ${Object.keys(data.scripts).join(', ') || '-'}`);
  out.push(`## Route API: ${data.routes}`);
  const text = out.join('\n');
  const dir = path.join(ROOT, '.context');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'digest.md'), text + '\n');
  console.log(text);
  console.log(`\n[disimpan: .context/digest.md | ~${tok(text)} tok]`);}

function map(pattern, opts) {
  const re = new RegExp(pattern, 'i');
  const exts = opts.ext ? opts.ext.split(',') : null;
  const max = Number(opts.max) || 20;
  const counts = [];
  const out = [];
  for (const f of files()) {
    if (exts && !exts.some((x) => f.rel.endsWith(x))) continue;
    let lines = [];
    try { lines = fs.readFileSync(path.join(ROOT, f.rel), 'utf8').split(/\r?\n/); } catch { continue; }
    let hits = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (!re.test(lines[i])) continue;
      hits += 1;
      if (opts.count || opts.paths) continue;
      out.push(`${f.rel}:${i + 1}: ${lines[i].trim().slice(0, Number(opts.width) || 120)}`);
      if (out.length >= max) break;
    }
    if (hits) counts.push(`${f.rel}: ${hits}`);
    if (opts.paths) out.push(f.rel);
    if (out.length >= max) break;
  }
  if (opts.paths) emit([...new Set(out)].slice(0, max).join('\n') || 'tidak ada hasil');
  else if (opts.count) emit(counts.sort((a, b) => Number(b.split(': ')[1]) - Number(a.split(': ')[1])).slice(0, 15).join('\n') || 'tidak ada hasil');
  else emit(out.join('\n') || 'tidak ada hasil');
}

function read(file, start, end) {
  const full = path.resolve(ROOT, file);
  if (!fs.existsSync(full)) { console.error(`tidak ada: ${file}`); process.exit(1); }
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  const s = Math.max(1, Number(start) || 1);
  const e = Math.min(lines.length, Number(end) || s + 79);
  const chunk = lines.slice(s - 1, e).map((l, i) => `${s + i}: ${l}`).join('\n');
  emit(`${file} [${s}-${e}/${lines.length}] ~${tok(chunk)} tok\n${chunk}`);
}

function size(top) {
  const list = files().sort((a, b) => b.tokens - a.tokens).slice(0, Number(top) || 15);
  emit(list.map((f) => `~${String(f.tokens).padStart(6)} tok  ${f.rel}`).join('\n'));
}

function handoff(opts) {
  const file = path.resolve(ROOT, opts.file || '.context/handoff.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const head = fs.existsSync(path.join(ROOT, '.git'))
    ? gitHead()
    : '-';
  const body = [
    `# Handoff â€” ${opts.title || 'sesi'}`,
    '',
    `- Tanggal: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `- Commit: ${head}`,
    `- Status: ${opts.status || '-'}`,
    `- Berikutnya: ${opts.next || '-'}`,
    '',
    'Baca berkas ini dulu, lalu lanjutkan tanpa mengulang penjelajahan.'
  ].join('\n');
  fs.writeFileSync(file, body + '\n');
  console.log(`handoff ditulis: ${path.relative(ROOT, file)} (~${tok(body)} tok)`);
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || '-';
  } catch {
    return '-';
  }
}

function buildIndex(quiet) {
  const list = files();
  const symbols = [];
  const routes = [];
  for (const f of list) {
    let lines = [];
    try { lines = fs.readFileSync(path.join(ROOT, f.rel), 'utf8').split(/\r?\n/); } catch { continue; }
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      let m = l.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/)
        || l.match(/^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/)
        || l.match(/^\s*(class|interface|type|enum)\s+([A-Za-z0-9_$]+)/);
      if (m) symbols.push(`${m[m.length - 1]} ${f.rel}:${i + 1}`);
      m = l.match(/\b(?:app|router)\.(get|post|put|delete|patch)\('([^']+)'/);
      if (m) routes.push(`${m[1].toUpperCase()} ${m[2]} ${f.rel}:${i + 1}`);
    }
  }
  const idx = { builtAt: new Date().toISOString(), files: list, symbols, routes };
  fs.mkdirSync(path.join(ROOT, '.context'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.context', 'index.json'), JSON.stringify(idx));
  if (!quiet) emit(`index: ${list.length} berkas, ${symbols.length} simbol, ${routes.length} route -> .context/index.json`);
  return idx;
}

function loadIndex() {
  const p = path.join(ROOT, '.context', 'index.json');
  const ttl = Number(process.env.CTX_INDEX_TTL || 600) * 1000;
  try {
    const st = fs.statSync(p);
    if (Date.now() - st.mtimeMs < ttl) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { /* belum ada */ }
  return buildIndex(true);
}

function find(q) {
  const idx = loadIndex();
  const n = String(q || '').toLowerCase();
  const out = [...idx.routes, ...idx.symbols, ...idx.files.map((f) => f.rel)]
    .filter((x) => x.toLowerCase().includes(n)).slice(0, 12);
  emit(out.join('\n') || 'tidak ada');
}

function bench() {
  const t = (fn) => { const s = Date.now(); fn(); return Date.now() - s; };
  const msMap = t(() => map('\u0000', { max: 1 }));
  const msFind = t(() => { const i = loadIndex(); return i.symbols.length; });
  emit(`map ${msMap} ms | find ${msFind} ms | index tersimpan di .context/index.json`);
}

const [cmd, ...rest] = process.argv.slice(2);
const opts = {};
const args = [];
for (let i = 0; i < rest.length; i += 1) {
  const a = rest[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    opts[k] = v !== undefined ? v : (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true);
  } else args.push(a);
}

if (cmd === 'digest') digest(Boolean(opts.json));
else if (cmd === 'map') map(args[0] || '.', opts);
else if (cmd === 'read') read(args[0], args[1], args[2]);
else if (cmd === 'size') size(opts.top);
else if (cmd === 'index') buildIndex(false);
else if (cmd === 'find') find(args[0]);
else if (cmd === 'bench') bench();
else if (cmd === 'handoff') handoff(opts);
else console.log('perintah: digest | map | read | size | index | find | bench | handoff');

