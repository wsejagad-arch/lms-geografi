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
    querySelectorAll: () => [],
    querySelector: () => null,
    scrollIntoView() {},
  });

  const host = {
    _html: '',
    set innerHTML(html) {
      this._html = String(html);
      labels.length = 0; inputs.length = 0;
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
    },
    get innerHTML() { return this._html; },
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    querySelectorAll(sel) {
      const s = String(sel).replace(/^#bl-eval\s*/, '');
      if (s === 'input[type=radio]') return inputs.filter((i) => i.type === 'radio');
      if (s === 'input[type=checkbox]') return inputs.filter((i) => i.type === 'checkbox');
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
  return { document, host, inputs, labels, submitBtn };
}

const dom = makeDom();
const sent = [];
let lastResponse = {
  score: 100, benar: 3, total: 3, kkm: 75, tuntas: true, best_score: 100, attempts: 1,
  hasil: [
    { soal_id: 's1', tipe: 'pgm', poin: 1, kunci: [1], pembahasan: 'karena B' },
    { soal_id: 's2', tipe: 'pg_kompleks', poin: 1, kunci: [0, 2], pembahasan: 'A dan C' },
    { soal_id: 's3', tipe: 'benar_salah', poin: 1, kunci: ['B', 'S'], pembahasan: 'benar lalu salah' },
  ],
};

const sandbox = {
  console,
  alert: () => {},
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
vm.runInContext(src + '\n;globalThis.__t = { get state(){return blState;}, blStartEval, blSubmit, blRenderResult, blRenderSoal };', sandbox);
const T = sandbox.__t;

check('belajar.js termuat & API tersedia', typeof T?.blStartEval === 'function' && typeof T?.blSubmit === 'function', '');

T.state.bab = {
  id: 'x-01',
  judul: 'Bab Uji',
  materi: [{ judul: 'Topik 1', html: '<p>isi</p>' }],
  soal: [
    { id: 's1', tipe: 'pgm', pertanyaan: 'Pilih B', opsi: ['A', 'B', 'C'], kunci: [1] },
    { id: 's2', tipe: 'pg_kompleks', pertanyaan: 'Pilih A & C', opsi: ['A', 'B', 'C'], kunci: [0, 2] },
    { id: 's3', tipe: 'benar_salah', pernyataan: [{ teks: 'p1' }, { teks: 'p2' }], kunci: ['B', 'S'] },
  ],
};
T.state.answers = {};
T.blStartEval();

check('render menghasilkan input opsi', dom.inputs.length >= 5, `input=${dom.inputs.length}`);

// --- soal 1: klik opsi B (index 1) ---
const q1 = dom.inputs.filter((i) => i.dataset.soal === 's1');
check('input soal 1 terikat ke data-soal', q1.length === 3, `radio=${q1.length}`);
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

// --- kirim ---
await T.blSubmit();
check('kirim mengarah ke endpoint evaluasi', (sent[0]?.url || '').includes('/api/kurikulum/x-01/evaluasi'), sent[0]?.url || 'tidak ada');
check('payload berisi jawaban per id soal', sent[0]?.body?.answers?.s1 === 2 && JSON.stringify(sent[0]?.body?.answers?.s2) === '[0,2]',
  JSON.stringify(sent[0]?.body?.answers || {}));
check('skor dari server ditampilkan', /\b100\b/.test(dom.host.innerHTML) && /bl-score/.test(dom.host.innerHTML), '');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exit(1);
