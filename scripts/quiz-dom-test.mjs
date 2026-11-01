// Uji alur klik opsi -> highlight -> kirim -> skor, tanpa dependensi (fake DOM).
// Jalankan: node scripts/quiz-dom-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'public/assets/js/belajar.js'), 'utf8');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

function parseAttrs(str) {
  const out = {};
  for (const m of str.matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  for (const m of str.matchAll(/([a-zA-Z-]+)\s*=\s*'([^']*)'/g)) out[m[1]] = m[2];
  return out;
}

function makeDom() {
  const labels = [];
  const inputs = [];
  const selects = [];

  const mkLabel = (attrs) => {
    const set = new Set();
    const label = {
      dataset: { soal: attrs['data-soal'], val: attrs['data-val'] },
      classList: {
        toggle(name, on) { if (on === undefined) on = !set.has(name); on ? set.add(name) : set.delete(name); },
        has(name) { return set.has(name); },
        add(name) { set.add(name); },
        remove(name) { set.delete(name); },
      },
      querySelector(sel) { return sel === 'input:checked' ? (label._input && label._input.checked ? label._input : null) : null; },
    };
    return label;
  };

  const mkInput = (attrs, label) => {
    const input = {
      type: attrs.type,
      name: attrs.name,
      value: attrs.value,
      checked: false,
      dataset: { soal: attrs['data-soal'], idx: attrs['data-idx'] },
      listeners: {},
      addEventListener(ev, fn) { input.listeners[ev] = fn; },
      click() {
        if (input.type === 'radio') {
          inputs.filter((i) => i.name === input.name).forEach((i) => { i.checked = false; });
          input.checked = true;
        } else {
          input.checked = !input.checked;
        }
        if (input.listeners.change) input.listeners.change();
      },
    };
    input._label = label;
    if (label) label._input = input;
    return input;
  };

  const generic = () => ({
    innerHTML: '', textContent: '', disabled: false,
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    remove() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    scrollIntoView() {},
  });

  const host = {
    _html: '',
    set innerHTML(html) {
      this._html = String(html);
      labels.length = 0; inputs.length = 0; selects.length = 0;
      const tokens = [...this._html.matchAll(/<label class="bl-opt"([^>]*)>|<input([^>]*)>/g)];
      let lastLabel = null;
      for (const t of tokens) {
        if (t[1] !== undefined) {
          lastLabel = mkLabel(parseAttrs(t[1]));
          labels.push(lastLabel);
        } else {
          const attrs = parseAttrs(t[2]);
          if (attrs.type === 'radio' || attrs.type === 'checkbox') inputs.push(mkInput(attrs, lastLabel));
        }
      }
      for (const token of this._html.matchAll(/<select([^>]*)>/g)) {
        const attrs = parseAttrs(token[1]);
        selects.push({
          dataset: { soal: attrs['data-soal'], idx: attrs['data-idx'] },
          value: '',
          listeners: {},
          addEventListener(ev, fn) { this.listeners[ev] = fn; },
        });
      }
    },
    get innerHTML() { return this._html; },
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    querySelectorAll(sel) {
      const s = String(sel).replace(/^#bl-eval\s*/, '');
      if (s === 'input[data-soal]') return inputs;
      if (s === 'input[type=radio]') return inputs.filter((i) => i.type === 'radio');
      if (s === 'input[type=checkbox]') return inputs.filter((i) => i.type === 'checkbox');
      if (s === 'select[data-soal]') return selects;
      const m = s.match(/^\.bl-opt\[data-soal="([^"]*)"\]$/);
      if (m) return labels.filter((l) => l.dataset.soal === m[1]);
      return [];
    },
    querySelector: () => null,
    scrollIntoView() {},
  };

  const submitBtn = Object.assign(generic(), { id: 'bl-submit' });
  const cancelBtn = Object.assign(generic(), { id: 'bl-cancel' });
  const document = {
    getElementById(id) {
      if (id === 'bl-eval') return host;
      if (id === 'bl-submit') return submitBtn;
      if (id === 'bl-cancel') return cancelBtn;
      return generic();
    },
    querySelectorAll: (sel) => (String(sel).includes('#bl-eval') ? host.querySelectorAll(sel) : []),
    addEventListener() {},
    createElement: () => generic(),
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
  };
  return { document, host, inputs, labels, selects, submitBtn };
}

const dom = makeDom();
const sent = [];
const alerts = [];
let cacheInvalidated = 0;
let dashboardRefreshes = 0;
let gradeRefreshes = 0;
let lastResponse = {
  score: 100, benar: 5, total: 5, kkm: 75, tuntas: true, best_score: 100,
  highest_score: 100, highest_attempt: 1, penalty_count: 0, attempts: 1,
  hasil: [
    { soal_id: 's1', tipe: 'pg_singkat', poin: 1, kunci: [1], pembahasan: 'karena B' },
    { soal_id: 's2', tipe: 'pg_kompleks', poin: 1, kunci: [0, 2], pembahasan: 'A dan C' },
    { soal_id: 's3', tipe: 'benar_salah', poin: 1, kunci: ['B', 'S'], pembahasan: 'benar lalu salah' },
    { soal_id: 's4', tipe: 'pgm', poin: 1, kunci: [2], pembahasan: 'kombinasi tepat' },
    { soal_id: 's5', tipe: 'menjodohkan', poin: 1, kunci: [1, 0], pembahasan: 'pasangan tepat' },
  ],
};

const sandbox = {
  console,
  alert: (message) => alerts.push(message),
  document: dom.document,
  localStorage: { getItem: () => null, setItem: () => {} },
  encodeURIComponent,
  setTimeout, clearTimeout,
  fetch: async (url, opts) => {
    sent.push({ url, body: opts && opts.body ? JSON.parse(opts.body) : null });
    return { ok: true, json: async () => lastResponse };
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(`
  globalThis.LMS_CACHE = { invalidate() { globalThis.__cacheInvalidated = (globalThis.__cacheInvalidated || 0) + 1; } };
  globalThis.renderDashboard = async () => { globalThis.__dashboardRefreshes = (globalThis.__dashboardRefreshes || 0) + 1; };
  globalThis.renderNilai = async () => { globalThis.__gradeRefreshes = (globalThis.__gradeRefreshes || 0) + 1; };
`, sandbox);
vm.runInContext(src + '\n;globalThis.__t = { get state(){return blState;}, blStartEval, blSubmit, blRenderResult, blRenderSoal, blSemesterJourney };', sandbox);
const T = sandbox.__t;

check('belajar.js termuat & API tersedia', typeof T?.blStartEval === 'function' && typeof T?.blSubmit === 'function', '');
const journey = T.blSemesterJourney({
  semester_aktif: 1,
  babs: [
    { is_active_semester: true, tuntas: true, judul: 'Materi Tuntas' },
    { is_active_semester: true, unlocked: true, tuntas: false, judul: 'Materi Berikutnya' },
    { is_active_semester: true, unlocked: false, tuntas: false, judul: 'Materi Terkunci' },
    { is_active_semester: false, tuntas: false, judul: 'Materi Semester Lain' },
  ],
}, 99);
check('alur semester menampilkan centang, gembok terbuka, dan gembok terkunci',
  journey.includes('Materi 1') && journey.includes('Materi 2') && journey.includes('Materi 3')
    && journey.includes('Materi Tuntas') && journey.includes('Materi Berikutnya')
    && !journey.includes('Materi Semester Lain')
    && (journey.match(/bl-journey-icon/g) || []).length === 3
    && journey.includes('bl-journey-step done')
    && journey.includes('bl-journey-step available')
    && journey.includes('bl-journey-step pending')
    && journey.includes('Terbuka, belum selesai')
    && journey.includes('Terkunci')
    && journey.includes('<svg viewBox="0 0 24 24"')
    && journey.includes('M8 11V8a4 4 0 0 1 8 0')
    && journey.includes('Rata-rata nilai 99')
    && journey.includes('bl-journey-dashboard'),
  '');
const dashboardSrc = fs.readFileSync(path.join(root, 'public/assets/js/student.js'), 'utf8');
const journeyCss = fs.readFileSync(path.join(root, 'public/assets/css/belajar.css'), 'utf8');
check('beranda menyertakan jalur semester mendatar dan nilai rata-rata',
  dashboardSrc.includes('blSemesterJourney(kurikulum, averageSemesterScore)')
    && journeyCss.includes('.bl-journey-dashboard .bl-journey-steps')
    && journeyCss.includes('flex-direction: row;'),
  '');

T.state.bab = {
  id: 'x-01',
  judul: 'Bab Uji',
  materi: [{ judul: 'Topik 1', html: '<p>isi</p>' }],
  soal: [
    { id: 's1', tipe: 'pg_singkat', pertanyaan: 'Pilih B', opsi: ['A', 'B', 'C'], kunci: [1] },
    { id: 's2', tipe: 'pg_kompleks', pertanyaan: 'Pilih A & C', opsi: ['A', 'B', 'C'], kunci: [0, 2] },
    { id: 's3', tipe: 'benar_salah', pernyataan: ['p1', 'p2'], kunci: ['B', 'S'] },
    { id: 's4', tipe: 'pgm', pertanyaan: 'Pilih satu kombinasi', opsi: ['A dan B', 'A dan C', 'B dan C'], kunci: [2] },
    { id: 's5', tipe: 'menjodohkan', pertanyaan: 'Pasangkan', kiri: ['P1', 'P2'], kanan: ['A', 'B'], kunci: [1, 0] },
  ],
};
T.state.answers = { s1: 0 };
T.blStartEval();

check('render menghasilkan input opsi', dom.inputs.length >= 8, `input=${dom.inputs.length}`);
check('draf pilihan sebelumnya dipulihkan ke input',
  dom.inputs.find((input) => input.dataset.soal === 's1' && input.value === '0')?.checked === true,
  '');

// --- soal 1: pilihan ganda biasa ---
const q1 = dom.inputs.filter((i) => i.dataset.soal === 's1');
check('input soal 1 pilihan ganda biasa terikat ke data-soal', q1.length === 3 && q1.every((i) => i.type === 'radio'), `radio=${q1.length}`);
q1[1].click();
check('klik opsi menyimpan jawaban', T.state.answers['s1'] === 1, `answers.s1=${JSON.stringify(T.state.answers['s1'])}`);
const s1sel = dom.labels.filter((l) => l.dataset.soal === 's1' && l.classList.has('sel'));
check('opsi terpilih dapat highlight', s1sel.length === 1 && s1sel[0].dataset.val === '1', `highlight=${s1sel.length}`);

const q1b = dom.inputs.filter((i) => i.dataset.soal === 's1')[2];
q1b.click();
check('pindah opsi memindahkan highlight', dom.labels.filter((l) => l.dataset.soal === 's1' && l.classList.has('sel')).every((l) => l.dataset.val === '2') && T.state.answers['s1'] === 2,
  `answers.s1=${T.state.answers['s1']}`);

// --- soal 2: checkbox kompleks ---
const q2 = dom.inputs.filter((i) => i.dataset.soal === 's2');
q2[0].click();
q2[2].click();
check('jawaban kompleks terkumpul', JSON.stringify(T.state.answers['s2']) === '[0,2]', `answers.s2=${JSON.stringify(T.state.answers['s2'])}`);

// --- soal 3: benar/salah ber-indeks ---
const q3 = dom.inputs.filter((i) => i.dataset.soal === 's3');
q3[0].click();
q3[3].click();
check('jawaban benar/salah per pernyataan', JSON.stringify(T.state.answers['s3']) === '["B","S"]', `answers.s3=${JSON.stringify(T.state.answers['s3'])}`);

// --- soal 4: pilihan ganda majemuk ---
const q4 = dom.inputs.filter((i) => i.dataset.soal === 's4');
q4[2].click();
check('pilihan ganda majemuk memilih satu kombinasi jawaban',
  q4.every((i) => i.type === 'radio') && T.state.answers['s4'] === 2,
  `answers.s4=${JSON.stringify(T.state.answers['s4'])}`);

// --- soal 5: menjodohkan ---
const q5 = dom.selects.filter((i) => i.dataset.soal === 's5');
q5[0].value = '1';
q5[0].listeners.change();
q5[1].value = '0';
q5[1].listeners.change();
check('soal menjodohkan menyimpan pasangan sesuai indeks',
  q5.length === 2 && JSON.stringify(T.state.answers['s5']) === '[1,0]',
  `answers.s5=${JSON.stringify(T.state.answers['s5'])}`);

// --- kirim ---
await T.blSubmit();
check('progres disimpan sebelum evaluasi dikirim',
  (sent[0]?.url || '').endsWith('/api/kurikulum/x-01/progress')
    && (sent[1]?.url || '').endsWith('/api/kurikulum/x-01/evaluasi'),
  sent.map((r) => r.url).join(' → '));
check('payload evaluasi berisi jawaban per id soal', sent[1]?.body?.answers?.s1 === 2 && JSON.stringify(sent[1]?.body?.answers?.s2) === '[0,2]'
  && sent[1]?.body?.answers?.s4 === 2 && JSON.stringify(sent[1]?.body?.answers?.s5) === '[1,0]',
  JSON.stringify(sent[1]?.body?.answers || {}));
check('skor dari server ditampilkan', /\b100\b/.test(dom.host.innerHTML) && /bl-score/.test(dom.host.innerHTML), '');
cacheInvalidated = vm.runInContext('globalThis.__cacheInvalidated || 0', sandbox);
dashboardRefreshes = vm.runInContext('globalThis.__dashboardRefreshes || 0', sandbox);
gradeRefreshes = vm.runInContext('globalThis.__gradeRefreshes || 0', sandbox);
check('rekap beranda dan riwayat diperbarui setelah evaluasi',
  cacheInvalidated === 1 && dashboardRefreshes === 1 && gradeRefreshes === 1,
  `cache=${cacheInvalidated} dashboard=${dashboardRefreshes} nilai=${gradeRefreshes}${alerts.length ? ` alert=${alerts[0]}` : ''}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exit(1);
