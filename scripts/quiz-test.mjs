// Uji alur menjawab soal: opsi bisa dipilih & skor terhitung. Jalankan: node scripts/quiz-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import bcrypt from 'bcryptjs';
import sanitizer from '../public/assets/js/sanitize.js';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { summarizeAttempts } = createRequire(import.meta.url)('../kurikulum.js');
const PORT = Number(process.env.QUIZ_PORT || 3990);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDb = path.join(os.tmpdir(), `lms-quiz-${process.pid}.json`);
const mockElements = new Map();
const removedNav = [];
function mockElement() {
  return { innerHTML: '', addEventListener() {}, scrollIntoView() {}, remove() {} };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

const sameScore = summarizeAttempts([{ ke: 1, score: 75 }, { ke: 2, score: 75 }]);
check('nilai ulangan yang sama tidak mengurangi nilai',
  sameScore.best_score === 75 && sameScore.penalty_count === 0,
  `nilai=${sameScore.best_score} pengurangan=${sameScore.penalty_count}`);
const lowerRepeat = summarizeAttempts([
  { ke: 1, score: 100 }, { ke: 2, score: 45 }, { ke: 3, score: 45 }
]);
check('setiap ulangan di bawah nilai tertinggi mengurangi satu poin',
  lowerRepeat.best_score === 98 && lowerRepeat.highest_attempt === 1 && lowerRepeat.penalty_count === 2,
  `nilai=${lowerRepeat.best_score} percobaanTertinggi=${lowerRepeat.highest_attempt}`);
const higherThenLower = summarizeAttempts([
  { ke: 1, score: 45 }, { ke: 2, score: 100 }, { ke: 3, score: 45 }
]);
check('ulangan yang naik di atas nilai sebelumnya tidak dihitung sebagai nilai rendah',
  higherThenLower.best_score === 99 && higherThenLower.highest_attempt === 2 && higherThenLower.penalty_count === 1,
  `nilai=${higherThenLower.best_score} percobaanTertinggi=${higherThenLower.highest_attempt}`);

// ---------- 1. render opsi harus membawa data-soal ----------
const belajarSrc = fs.readFileSync(path.join(root, 'public/assets/js/belajar.js'), 'utf8');
const sandbox = {
  console,
  alert: () => {},
  document: {
    getElementById: (id) => {
      if (!mockElements.has(id)) mockElements.set(id, mockElement());
      return mockElements.get(id);
    },
    querySelectorAll: (selector) => selector === '.bl-topic-nav-footer, .bl-topic-pos'
      ? [{ remove: () => removedNav.push('footer') }, { remove: () => removedNav.push('position') }]
      : [],
    addEventListener: () => {},
    body: { classList: { add() {}, remove() {} } },
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  fetch: async () => ({ ok: true, json: async () => ({}) }),
};
Object.assign(sandbox, sanitizer);
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(belajarSrc, sandbox);
} catch (e) {
  check('belajar.js bisa dimuat', false, e.message);
}
const blRenderSoal = sandbox.blRenderSoal;

function renderInputs(soal) {
  return String(blRenderSoal(soal, 0) || '');
}

if (typeof blRenderSoal === 'function') {
  const cases = [
    { tipe: 'pgm', soal: { id: 'soal-1', tipe: 'pgm', opsi: ['A', 'B', 'C'], kunci: [1] } },
    { tipe: 'pg_singkat', soal: { id: 'soal-2', tipe: 'pg_singkat', opsi: ['A', 'B'], kunci: [0] } },
    { tipe: 'pg_kompleks', soal: { id: 'soal-3', tipe: 'pg_kompleks', opsi: ['A', 'B', 'C'], kunci: [0, 2] } },
    { tipe: 'benar_salah', soal: { id: 'soal-4', tipe: 'benar_salah', pernyataan: [{ teks: 'x' }], kunci: ['B'] } },
  ];
  for (const c of cases) {
    const html = renderInputs(c.soal);
    const inputs = html.match(/<input[^>]*>/g) || [];
    const withSoal = inputs.filter((tag) => tag.includes(`data-soal="${c.soal.id}"`));
    check(`opsi ${c.tipe} punya data-soal`, inputs.length > 0 && withSoal.length === inputs.length,
      `input=${inputs.length} sesuai=${withSoal.length}`);
  }
  const videoHtml = renderInputs({
    id: 'video-soal',
    tipe: 'pgm',
    opsi: ['A', 'B'],
    youtube_id: 'videoid1234',
    stimulus: { youtube_id: 'videoid1234' },
  });
  check('video soal dapat diputar', videoHtml.includes('youtube.com/embed/videoid1234?rel=0&amp;playsinline=1')
    && videoHtml.includes('referrerpolicy="strict-origin-when-cross-origin"')
    && videoHtml.includes('allowfullscreen'), '');
  vm.runInContext('blState.kurikulum = { kkm: 75 }', sandbox);
  const previewCard = sandbox.blBabCard({
    id: 'bab-berikutnya',
    urutan: 2,
    judul: 'Materi Berikutnya',
    ringkasan: 'Ringkasan materi terkunci',
    jumlah_soal: 5,
    unlocked: false,
    lock_reason: 'evaluasi_sebelumnya',
  }, true);
  check('bab berikutnya tampil sebagai pratinjau terkunci',
    previewCard.includes('bl-bab locked bl-bab-preview')
      && previewCard.includes('aria-disabled="true"')
      && previewCard.includes('Materi berikutnya')
      && previewCard.includes('Terkunci'), '');
  vm.runInContext(`blState.bab = {
    urutan: 1,
    judul: 'Materi Uji',
    cp: '',
    tujuan: [],
    materi: [{ judul: 'Topik 1', html: '<p>Isi materi</p>' }],
    glosarium: [{ istilah: 'Istilah uji', arti: 'Definisi uji' }],
    kkm: 75,
    progress: { best_score: 40, attempts: 1, riwayat: [] },
    soal: [],
  }; blState.activeTopicIndex = 0`, sandbox);
  sandbox.blRenderBab();
  const detailHtml = mockElements.get('belajar-root').innerHTML;
  const evalHtml = mockElements.get('bl-eval').innerHTML;
  check('detail bab tidak menampilkan glosarium atau teks evaluasi',
    !detailHtml.includes('Glosarium')
      && !detailHtml.includes('Istilah uji')
      && !detailHtml.includes('Evaluasi Materi')
      && !detailHtml.includes('Nilai terbaik')
      && !detailHtml.includes('id="bl-back-2"')
      && !detailHtml.includes('Daftar materi'), '');
  check('detail bab menampilkan evaluasi tanpa tombol mulai duplikat',
    !detailHtml.includes('Lanjut ke Evaluasi ↓')
      && !detailHtml.includes('Bagian 1 dari 1')
      && evalHtml.includes('Evaluasi Materi Uji')
      && !detailHtml.includes('Mulai Evaluasi')
      && !detailHtml.includes('id="bl-start"')
      && !evalHtml.includes('id="bl-start"'), '');
  vm.runInContext(`blState.bab.soal = [{
    id: 'result-q1', tipe: 'pg_singkat', opsi: ['Benar'], kunci: [0], pembahasan: 'Pembahasan'
  }]; blRenderResult({
    score: 80, kkm: 75, benar: 1, total: 1, best_score: 80, attempts: 1, tuntas: true,
    hasil: [{ poin: 1, kunci: [0], pembahasan: 'Pembahasan' }]
  })`, sandbox);
  const resultHtml = mockElements.get('bl-eval').innerHTML;
  check('hasil menyembunyikan navigasi topik dan menampilkan ulang tanpa daftar materi',
    removedNav.length === 2
      && resultHtml.includes('Kerjakan Soal Ulang')
      && !resultHtml.includes('Daftar Materi')
      && !resultHtml.includes('bl-tolist')
      && resultHtml.includes('bl-next-bab'), '');
  const belajarCss = fs.readFileSync(path.join(root, 'public/assets/css/belajar.css'), 'utf8');
  check('ringkasan bab terkunci diburamkan',
    belajarCss.includes('.bl-bab.locked .bl-bab-body > p { filter: blur(4px);'), '');
  const questionTypes = ['pg_singkat', 'pgm', 'pg_kompleks', 'menjodohkan', 'benar_salah'];
  let chapterCount = 0;
  let questionCount = 0;
  let completeBank = true;
  for (const level of ['x', 'xi', 'xii']) {
    const dir = path.join(root, 'data/kurikulum', `kelas-${level}`);
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
      for (const bab of JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))) {
        chapterCount++;
        questionCount += bab.soal.length;
        const types = new Set(bab.soal.map((soal) => soal.tipe));
        completeBank &&= bab.soal.length >= 5 && bab.soal.length <= 10
          && questionTypes.every((type) => types.has(type))
          && bab.soal.every((soal) => {
            const key = soal.kunci || [];
            const validIndices = (size, min = 1) => key.length >= min
              && key.every((value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) < size);
            const shapeValid = soal.tipe === 'pg_singkat' || soal.tipe === 'pgm'
              ? Array.isArray(soal.opsi) && soal.opsi.length === 5 && key.length === 1 && validIndices(soal.opsi.length)
              : soal.tipe === 'pg_kompleks'
                ? Array.isArray(soal.opsi) && soal.opsi.length === 5 && validIndices(soal.opsi.length, 2)
                : soal.tipe === 'benar_salah'
                  ? Array.isArray(soal.pernyataan) && soal.pernyataan.length >= 2 && key.length === soal.pernyataan.length
                    && key.every((value) => value === 'B' || value === 'S')
                  : soal.tipe === 'menjodohkan'
                    && Array.isArray(soal.kiri) && Array.isArray(soal.kanan)
                    && soal.kiri.length >= 2 && soal.kanan.length >= 2
                    && key.length === soal.kiri.length && validIndices(soal.kanan.length);
            return shapeValid && String(soal.stimulus?.isi || '').replace(/<[^>]+>/g, ' ').length >= 800
              && String(soal.pembahasan || '').length >= 80;
          });
      }
    }
  }
  check('bank kelas X–XII berisi 5–10 soal tiap bab dengan bacaan panjang dan semua tipe',
    completeBank, `bab=${chapterCount} soal=${questionCount}`);
  const adminSrc = fs.readFileSync(path.join(root, 'public/assets/js/admin.js'), 'utf8');
  check('editor admin bisa tambah, hapus, ganti tipe, dan mengisi gambar stimulus',
    adminSrc.includes('kur-add-soal')
      && adminSrc.includes('kur-del-soal')
      && adminSrc.includes('k-s-tipe')
      && adminSrc.includes('k-s-gambar')
      && adminSrc.includes("opsi: ['', '', '', '', '']")
      && adminSrc.includes('s.opsi.length === 5')
      && questionTypes.every((type) => adminSrc.includes(`value="${type}"`)), '');
} else {
  check('blRenderSoal tersedia', false, 'fungsi tidak terdefinisi');
}

// ---------- 1b. alur exam: nama input sama antara render & submit ----------
const studentSrc = fs.readFileSync(path.join(root, 'public/assets/js/student.js'), 'utf8');
check('video materi memakai pemutar aman', studentSrc.includes('lmsYoutubeEmbedUrl(videoId)')
  && studentSrc.includes('referrerpolicy="strict-origin-when-cross-origin"'), '');
check('exam: nama radio render = submit', studentSrc.includes('name="exam-${examId}-${i}"') && studentSrc.includes('input[name="exam-${examId}-${i}"]:checked'),
  '');
check('exam: tidak lagi memakai s.jawaban di klien', !/s\.jawaban|q\.jawaban/.test(studentSrc), '');
const db = JSON.parse(fs.readFileSync(path.join(root, 'data/db.json'), 'utf8'));
const tenant = db.tenants[0];
const klass = db.classes[0] || { id: 'kelas-uji', tenant_id: tenant.id, nama: 'X-A', tingkat: 'X' };
if (!db.classes[0]) db.classes.push(klass);
db.students = db.students.filter((s) => !String(s.id).startsWith('siswa-'));
db.students.push({
  id: 'siswa-a', tenant_id: tenant.id, nama: 'Siswa A', nis: 'NIS-A', username: 'siswa.a',
  email: 'siswa.a@uji.local', class_id: klass.id, kelas_level: 'X',
  password: bcrypt.hashSync('rahasia123', 8), created_at: new Date().toISOString(),
});
db.progress = [];
db.attempts = [];
db.users = db.users.filter((u) => !String(u.email || '').endsWith('@uji.local'));
db.users.push({
  id: 'admin-a', tenant_id: tenant.id, email: 'admin.a@uji.local', nama: 'Admin Uji', role: 'admin',
  password: bcrypt.hashSync('admin-rahasia', 8), created_at: new Date().toISOString(),
});
fs.writeFileSync(tmpDb, JSON.stringify(db, null, 2));

const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: tmpDb },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => { log += d; });
server.stderr.on('data', (d) => { log += d; });

const cookies = { student: '', admin: '' };
async function req(method, url, body, as = 'student') {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookies[as] ? { Cookie: cookies[as] } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const sc = res.headers.getSetCookie?.() || [];
  if (sc.length) cookies[as] = sc.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* bukan json */ }
  return { status: res.status, json, text };
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + '/api/me');
      if (r.status === 401 || r.status === 200) return true;
    } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function answersFromKunci(soal) {
  const out = {};
  for (const s of soal) {
    const k = Array.isArray(s.kunci) ? s.kunci : [s.kunci];
    if (s.tipe === 'pg_singkat' || s.tipe === 'pgm') out[s.id] = Number(k[0]);
    else if (s.tipe === 'pg_kompleks') out[s.id] = k.map(Number);
    else if (s.tipe === 'benar_salah') out[s.id] = k.map(String);
    else if (s.tipe === 'menjodohkan') out[s.id] = k.map(String);
    else out[s.id] = k.map(Number);
  }
  return out;
}

// Kunci dibaca dari berkas konten (bukan dari API, karena API sengaja menyembunyikannya).
function loadBabFromDisk(level, babId) {
  const dir = path.join(root, 'data/kurikulum', `kelas-${String(level).toLowerCase()}`);
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const babs = data.babs || data;
    const found = babs.find((b) => b.id === babId);
    if (found) return found;
  }
  return null;
}

try {
  check('server siap', await waitReady(), path.basename(tmpDb));
  const login = await req('POST', '/api/student/login', { username: 'siswa.a', password: 'rahasia123' });
  check('login siswa', login.status === 200, `status=${login.status}`);
  const adminLogin = await req('POST', '/api/login', { email: 'admin.a@uji.local', password: 'admin-rahasia' }, 'admin');
  check('login admin untuk pengaturan akademik', adminLogin.status === 200, `status=${adminLogin.status}`);
  const initialSettings = await req('GET', '/api/admin/semester-aktif', undefined, 'admin');
  const initialYear = initialSettings.json?.tahun_pelajaran_aktif;
  const initialSemester = initialSettings.json?.semester_aktif;
  check('pengaturan akademik mengirim tahun, daftar tahun, dan semester',
    initialSettings.status === 200 && /^\d{4}\/\d{4}$/.test(initialYear || '')
      && initialSettings.json.tahun_pelajaran_options.includes(initialYear)
      && [1, 2].includes(initialSemester),
    `status=${initialSettings.status} tahun=${initialYear} semester=${initialSemester}`);
  const matchYear = String(initialYear || '').match(/^(\d{4})\/(\d{4})$/);
  const newAcademicYear = `${Number(matchYear?.[1] || 2030) + 1}/${Number(matchYear?.[2] || 2031) + 1}`;
  const addedYear = await req('POST', '/api/admin/semester-aktif', {
    tambah_tahun_pelajaran: newAcademicYear,
  }, 'admin');
  check('admin dapat menambahkan dan mengaktifkan tahun pelajaran',
    addedYear.status === 200 && addedYear.json.tahun_pelajaran_aktif === newAcademicYear
      && addedYear.json.tahun_pelajaran_options.includes(newAcademicYear),
    `status=${addedYear.status} aktif=${addedYear.json?.tahun_pelajaran_aktif}`);
  const selectedYear = await req('POST', '/api/admin/semester-aktif', {
    tahun_pelajaran_aktif: initialYear,
  }, 'admin');
  const selectedSemester = await req('POST', '/api/admin/semester-aktif', { semester: 2 }, 'admin');
  const restoredSemester = await req('POST', '/api/admin/semester-aktif', { semester: initialSemester }, 'admin');
  const invalidYear = await req('POST', '/api/admin/semester-aktif', {
    tambah_tahun_pelajaran: '2026/2028',
  }, 'admin');
  check('admin dapat mengubah tahun aktif dan semester, format tahun salah ditolak',
    selectedYear.status === 200 && selectedYear.json.tahun_pelajaran_aktif === initialYear
      && selectedSemester.json?.semester_aktif === 2
      && restoredSemester.json?.semester_aktif === initialSemester
      && invalidYear.status === 400,
    `tahun=${selectedYear.json?.tahun_pelajaran_aktif} semester=${restoredSemester.json?.semester_aktif} invalid=${invalidYear.status}`);
  const studentSettingsWrite = await req('POST', '/api/admin/semester-aktif', {
    tahun_pelajaran_aktif: newAcademicYear,
  }, 'student');
  check('siswa tidak dapat mengubah tahun pelajaran aktif', studentSettingsWrite.status === 403,
    `status=${studentSettingsWrite.status}`);

  const kur = await req('GET', '/api/kurikulum');
  const bab = kur.json?.babs?.find((b) => b.unlocked) || kur.json?.babs?.[0];
  check('kurikulum punya bab', !!bab, `bab=${bab?.id || '-'}`);

  const detail = await req('GET', `/api/kurikulum/${bab.id}`);
  const soal = detail.json?.soal || [];
  check('detail bab memuat soal + opsi', soal.length > 0 && soal.every((s) => Array.isArray(s.opsi) || s.tipe === 'benar_salah' || s.tipe === 'menjodohkan'),
    `soal=${soal.length}`);
  check('soal pilihan ganda memakai opsi A-E',
    soal.filter(s => ['pg_singkat', 'pgm', 'pg_kompleks'].includes(s.tipe)).every(s => s.opsi.length === 5),
    `opsi=${soal.filter(s => ['pg_singkat', 'pgm', 'pg_kompleks'].includes(s.tipe)).map(s => s.opsi.length).join(',')}`);
  check('detail bab tidak membocorkan kunci', soal.every((s) => s.kunci === undefined), '');

  const diskBab = loadBabFromDisk(db.students.find((s) => s.id === 'siswa-a')?.kelas_level || 'X', bab.id);
  check('bab ditemukan di berkas konten', !!diskBab, `bab=${bab.id}`);

  const kunciMap = answersFromKunci(diskBab.soal);
  const draft = { [soal[0].id]: kunciMap[soal[0].id] };
  const savedProgress = await req('PUT', `/api/kurikulum/${bab.id}/progress`, {
    topic_progress: { 0: 50, [soal.length + 3]: 100, '-1': 100 },
    answers: draft
  });
  check('progres baca dan draf jawaban tersimpan dengan indeks valid',
    savedProgress.status === 200 && savedProgress.json.reading_percent > 0
      && savedProgress.json.answered_questions === 1
      && savedProgress.json.assessment_percent === Math.round(100 / soal.length),
    `status=${savedProgress.status} error=${savedProgress.json?.error || '-'} baca=${savedProgress.json?.reading_percent} jawab=${savedProgress.json?.answered_questions}`);
  const savedDetail = await req('GET', `/api/kurikulum/${bab.id}`);
  check('progres dan draf tetap tersedia setelah detail dimuat ulang',
    savedDetail.json?.progress?.reading_percent === savedProgress.json?.reading_percent
      && savedDetail.json?.progress?.answered_questions === 1
      && savedDetail.json?.progress?.draft_answers?.[soal[0].id] !== undefined,
    `baca=${savedDetail.json?.progress?.reading_percent} jawab=${savedDetail.json?.progress?.answered_questions}`);
  const matchingQuestion = diskBab.soal.find((item) => item.tipe === 'menjodohkan');
  const partialPairs = [];
  partialPairs[matchingQuestion.kiri.length - 1] = 0;
  const partialProgress = await req('PUT', `/api/kurikulum/${bab.id}/progress`, {
    topic_progress: { 0: 50 },
    answers: { [matchingQuestion.id]: partialPairs }
  });
  check('jawaban menjodohkan yang hanya terisi sebagian tidak dihitung tuntas',
    partialProgress.status === 200 && partialProgress.json.answered_questions === 0,
    `terjawab=${partialProgress.json?.answered_questions}`);

  const pgmSoal = diskBab.soal.find((s) => s.tipe === 'pgm');
  check('PGM mengirim satu indeks pilihan', !!pgmSoal && typeof kunciMap[pgmSoal.id] === 'number',
    `jawaban=${pgmSoal ? JSON.stringify(kunciMap[pgmSoal.id]) : 'tidak ditemukan'}`);
  const benar = await req('POST', `/api/kurikulum/${bab.id}/evaluasi`, { answers: kunciMap });
  check('jawaban benar -> skor 100', benar.status === 200 && benar.json.score === 100,
    `status=${benar.status} score=${benar.json?.score}`);
  const quizActivity = await req('GET', '/api/admin/activity-log', undefined, 'admin');
  check('aktivitas mengerjakan evaluasi tercatat di admin',
    quizActivity.status === 200 && quizActivity.json.events.some((event) =>
      event.student_id === 'siswa-a' && event.aksi === 'Mengerjakan evaluasi materi'
    ),
    `status=${quizActivity.status}`);
  check('jawaban benar -> tuntas', benar.json?.tuntas === true, `tuntas=${benar.json?.tuntas}`);
  check('kunci dibuka setelah tuntas', (benar.json?.hasil || []).every((h) => 'kunci' in h), '');

  const jawabanPgmSalah = {
    ...kunciMap,
    [pgmSoal.id]: (kunciMap[pgmSoal.id] + 1) % pgmSoal.opsi.length,
  };
  const salahPgm = await req('POST', `/api/kurikulum/${bab.id}/evaluasi`, { answers: jawabanPgmSalah });
  const hasilPgmSalah = salahPgm.json?.hasil?.find((h) => h.soal_id === pgmSoal.id);
  check('PGM dinilai salah untuk pilihan kombinasi yang keliru',
    salahPgm.status === 200 && hasilPgmSalah?.poin === 0 && salahPgm.json.score < 100,
    `score=${salahPgm.json?.score} poin=${hasilPgmSalah?.poin}`);
  check('nilai akhir berkurang satu setelah ulangan dengan nilai lebih rendah',
    salahPgm.json?.best_score === 99
      && salahPgm.json?.highest_score === 100
      && salahPgm.json?.highest_attempt === 1
      && salahPgm.json?.penalty_count === 1,
    `nilaiAkhir=${salahPgm.json?.best_score} tertinggi=${salahPgm.json?.highest_score} percobaan=${salahPgm.json?.highest_attempt}`);
  const gradesBeforeEmpty = await req('GET', `/api/grades?student_id=siswa-a`);
  check('nilai setiap evaluasi materi masuk ke riwayat siswa',
    gradesBeforeEmpty.status === 200
      && gradesBeforeEmpty.json.length === 1
      && gradesBeforeEmpty.json[0].tipe === 'Materi Evaluasi'
      && gradesBeforeEmpty.json[0].catatan.includes(diskBab.judul)
      && gradesBeforeEmpty.json[0].nilai === 99
      && gradesBeforeEmpty.json[0].nilai_tertinggi === 100
      && gradesBeforeEmpty.json[0].percobaan_nilai_tertinggi === 1
      && gradesBeforeEmpty.json[0].jumlah_percobaan === 2,
    `records=${gradesBeforeEmpty.json?.length} nilai=${gradesBeforeEmpty.json?.[0]?.nilai}`);

  const kosong = await req('POST', `/api/kurikulum/${bab.id}/evaluasi`, { answers: {} });
  check('tanpa jawaban -> skor 0', kosong.status === 200 && kosong.json.score === 0,
    `score=${kosong.json?.score}`);
  check('pengulangan nilai nol tetap satu komponen dan menambah pengurangan',
    kosong.json?.best_score === 98 && kosong.json?.penalty_count === 2,
    `nilaiAkhir=${kosong.json?.best_score} pengurangan=${kosong.json?.penalty_count}`);

  const bentukLama = await req('POST', `/api/kurikulum/${bab.id}/evaluasi`, { answers: { undefined: 0 } });
  check('bentuk jawaban lama (tanpa data-soal) -> skor 0', bentukLama.status === 200 && bentukLama.json.score === 0,
    `score=${bentukLama.json?.score}`);
  const allGrades = await req('GET', `/api/grades?student_id=siswa-a`);
  check('semua ulangan tetap tercatat dalam satu komponen dengan nilai akhir terbaru',
    allGrades.status === 200 && allGrades.json.length === 1 && allGrades.json[0].nilai === 97
      && allGrades.json[0].jumlah_percobaan === 4,
    `records=${allGrades.json?.length} nilai=${allGrades.json?.[0]?.nilai} percobaan=${allGrades.json?.[0]?.jumlah_percobaan}`);
} finally {
  server.kill();
  fs.rmSync(tmpDb, { force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.log('--- server log ---\n' + log.split(/\r?\n/).slice(0, 10).join('\n'));
  process.exit(1);
}
