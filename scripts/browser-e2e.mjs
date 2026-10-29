// E2E browser sungguhan (headless Chrome via CDP), tanpa dependensi npm.
// Jalankan: node scripts/browser-e2e.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_PORT = Number(process.env.E2E_APP_PORT || 3987);
const CDP_PORT = Number(process.env.E2E_CDP_PORT || 9333);
const BASE = `http://127.0.0.1:${APP_PORT}`;
const tmpDb = path.join(os.tmpdir(), `lms-e2e-${process.pid}.json`);
const profile = path.join(os.tmpdir(), `lms-e2e-profile-${process.pid}`);

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error('Chrome/Edge tidak ditemukan');
  process.exit(2);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

// ---------- data uji ----------
const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const tenant = db.tenants[0];
const klass = db.classes[0] || { id: 'kelas-uji', tenant_id: tenant.id, nama: 'X-A', tingkat: 'X' };
if (!db.classes[0]) db.classes.push(klass);
db.users = db.users.filter((u) => !String(u.email || '').endsWith('@uji.local'));
db.students = db.students.filter((s) => !String(s.id).startsWith('siswa-'));
db.students.push({
  id: 'siswa-e2e', tenant_id: tenant.id, nama: 'Siswa E2E', nis: 'E2E01', username: 'E2E01',
  email: 'e2e@uji.local', class_id: klass.id, kelas_level: 'X',
  password: bcrypt.hashSync('E2E01', 8), created_at: new Date().toISOString(),
});
db.progress = [];
db.attempts = [];
fs.writeFileSync(tmpDb, JSON.stringify(db, null, 2));

// ---------- server aplikasi ----------
const app = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(APP_PORT), LMS_DB_PATH: tmpDb, SESSION_TOUCH_MS: '1000' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let appLog = '';
app.stdout.on('data', (d) => { appLog += d; });
app.stderr.on('data', (d) => { appLog += d; });

async function waitApp() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/me`);
      if (r.status === 401 || r.status === 200) return true;
    } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

// ---------- chrome + CDP ----------
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--window-size=1280,900',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${CDP_PORT}`, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

async function waitCdp() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) return true;
    } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }
      }, 30000);
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error');
    return r.result?.value;
  }
}

async function connect() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return { cdp, ws };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  check('server app siap', await waitApp(), BASE);
  check('chrome + CDP siap', await waitCdp(), `port=${CDP_PORT}`);

  const { cdp, ws } = await connect();

  async function goto(url) {
    await cdp.send('Page.navigate', { url });
    await sleep(1200);
  }

  async function waitFor(expr, timeout = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await cdp.eval(`Boolean(${expr})`)) return true;
      await sleep(300);
    }
    return false;
  }

  // 1. halaman login (student.html tanpa sesi akan redirect ke index.html)
  await goto(`${BASE}/student.html`);
  const onLogin = await waitFor(`document.getElementById('login-form')`);
  check('tanpa sesi redirect ke halaman login', onLogin, await cdp.eval('location.pathname'));

  // 2. login lewat form (username = NIS, password = NIS)
  await cdp.eval(`(() => {
    document.getElementById('email').value = 'E2E01';
    document.getElementById('password').value = 'E2E01';
    document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    return true;
  })()`);
  const loggedIn = await waitFor(`localStorage.getItem('lms_logged_in') || location.pathname.indexOf('student') >= 0`, 15000);
  check('submit form login berhasil', loggedIn, await cdp.eval('location.pathname'));

  // 3. buka halaman siswa dengan sesi aktif
  await goto(`${BASE}/student.html`);
  const studentPage = await waitFor(`document.getElementById('exam-list') || document.querySelector('.nav-item, .bottom-nav-item')`, 15000);
  check('halaman siswa terbuka setelah login', studentPage, await cdp.eval('document.title'));

  // 4. buka Pembelajaran dan bab pertama (memakai fungsi internal belajar.js)
  const navBelajar = await cdp.eval(`(() => {
    const nav = [...document.querySelectorAll('[data-nav], [data-menu]')].find(e => /belajar/i.test(e.dataset.nav || e.dataset.menu || ''));
    if (nav) { nav.click(); return 'klik-nav'; }
    return 'tidak-ada';
  })()`);
  check('masuk menu Pembelajaran', navBelajar !== 'tidak-ada', navBelajar);
  await sleep(800);

  const bukaBab = await cdp.eval(`(async () => {
    if (typeof blLoadKurikulum !== 'function') return 'fungsi-tidak-ada';
    await blLoadKurikulum();
    const list = (blState && blState.kurikulum && blState.kurikulum.babs) || [];
    const bab = list.find(b => b.unlocked) || list[0];
    if (!bab) return 'bab-kosong';
    await blOpenBab(bab.id);
    blStartEval();
    return bab.id;
  })()`);
  check('bab berhasil dibuka', bukaBab !== 'bab-kosong' && bukaBab !== 'fungsi-tidak-ada', String(bukaBab));

  const adaSoal = await waitFor(`document.querySelectorAll('#bl-eval input[type=radio], #bl-eval input[type=checkbox]').length > 0`, 15000);
  check('soal evaluasi ter-render', adaSoal, '');

  if (adaSoal) {
    // jawab semua soal dengan kunci dari berkas konten
    const dir = path.join(root, 'data/kurikulum', 'kelas-x');
    let diskBab = null;
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      diskBab = (data.babs || data).find((b) => b.id === bukaBab) || diskBab;
    }
    const kunciMap = {};
    for (const s of (diskBab?.soal || [])) kunciMap[s.id] = { tipe: s.tipe, kunci: s.kunci };

    const klik = await cdp.eval(`(() => {
      const KUNCI = ${JSON.stringify(kunciMap)};
      let dipilih = 0;
      const fire = (el) => { el.dispatchEvent(new Event('change', { bubbles: true })); dipilih++; };
      for (const id of Object.keys(KUNCI)) {
        const { tipe, kunci } = KUNCI[id];
        if (tipe === 'pgm' || tipe === 'pg_singkat') {
          const inp = document.querySelector('#bl-eval input[data-soal="' + id + '"][value="' + kunci[0] + '"]');
          if (inp) { inp.checked = true; fire(inp); }
        } else if (tipe === 'pg_kompleks') {
          kunci.forEach(v => {
            const inp = document.querySelector('#bl-eval input[data-soal="' + id + '"][value="' + v + '"]');
            if (inp && !inp.checked) { inp.checked = true; fire(inp); }
          });
        } else if (tipe === 'benar_salah') {
          kunci.forEach((v, idx) => {
            const inp = document.querySelector('#bl-eval input[data-soal="' + id + '"][data-idx="' + idx + '"][value="' + v + '"]');
            if (inp) { inp.checked = true; fire(inp); }
          });
        } else if (tipe === 'menjodohkan') {
          kunci.forEach((v, idx) => {
            const sel = document.querySelector('#bl-eval select[data-soal="' + id + '"][data-idx="' + idx + '"]');
            if (sel) { sel.value = String(v); fire(sel); }
          });
        }
      }
      const inp = document.querySelector('#bl-eval input[type=radio], #bl-eval input[type=checkbox]');
      return { dipilih, soal: inp ? inp.dataset.soal : null, highlight: !!document.querySelector('#bl-eval .bl-opt.sel') };
    })()`);
    check('opsi membawa data-soal', !!klik.soal, `soal=${klik.soal}`);
    check('opsi terpilih ter-highlight', klik.highlight === true, `highlight=${klik.highlight}`);
    check('semua soal terisi', klik.dipilih >= 5, `dipilih=${klik.dipilih}`);

    const kirim = await cdp.eval(`(() => {
      const btn = document.getElementById('bl-submit');
      if (!btn) return 'tombol-tidak-ada';
      btn.click();
      return 'dikirim';
    })()`);
    const adaSkor = await waitFor(`document.querySelector('#bl-eval .bl-score')`, 20000);
    const skor = await cdp.eval(`(document.querySelector('#bl-eval .bl-score') || {}).textContent || null`);
    check('kirim jawaban memunculkan skor', adaSkor && skor !== null, `skor=${skor} (${kirim})`);
    check('jawaban benar -> skor 100', String(skor).trim() === '100', `skor=${skor}`);
  }

  // 5. screenshot bukti (fokus ke blok hasil)
  await cdp.eval(`(() => { const el = document.querySelector('#bl-eval'); if (el) el.scrollIntoView({ block: 'start' }); return true; })()`);
  await sleep(600);
  const shot = path.join(os.tmpdir(), 'lms-e2e.png');
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(shot, Buffer.from(data, 'base64'));
  check('screenshot tersimpan', fs.existsSync(shot), shot);

  ws.close();
} catch (e) {
  check('E2E berjalan tanpa error', false, e.message);
} finally {
  chrome.kill();
  app.kill();
  fs.rmSync(tmpDb, { force: true });
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* profil chrome masih terkunci */ }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- app log ---\n' + appLog.split(/\r?\n/).slice(0, 8).join('\n'));
  process.exit(1);
}
