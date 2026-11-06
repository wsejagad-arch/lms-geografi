// Uji tugas mengamati video: validasi soal, kunci jawaban tidak bocor, video tidak
// bisa dilewati (server menolak kiriman yang belum menonton), dan nilai tercatat.
// Jalankan: node scripts/video-task-test.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helpers = createRequire(import.meta.url)('../video-task.js');
const PORT = Number(process.env.VIDEO_TASK_PORT || 3996);
const BASE = `http://127.0.0.1:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-video-task-'));
const dbPath = path.join(dir, 'db.json');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
}

// ---------- 1. Validasi & penilaian (unit) ----------
const validPayload = {
  judul: 'Mengamati Siklus Hidrologi',
  youtube_id: 'https://www.youtube.com/watch?v=cTlY4dDk0aQ',
  durasi: 120,
  soal: [
    { waktu: 40, pertanyaan: 'Proses apa yang terjadi?', opsi: ['Evaporasi', 'Presipitasi', 'Infiltrasi', 'Kondensasi'], kunci: 0, pembahasan: 'Air menguap.' },
    { waktu: 10, pertanyaan: 'Apa nama siklus air?', opsi: ['Siklus karbon', 'Siklus hidrologi'], kunci: 1 }
  ]
};
const built = helpers.buildTaskData(validPayload);
check('payload valid menghasilkan data tugas', !built.error && built.data.soal.length === 2, built.error || '');
check('soal diurutkan berdasarkan detik', built.data && built.data.soal[0].waktu === 10 && built.data.soal[1].waktu === 40);
check('youtube id dinormalisasi dari URL', built.data && built.data.youtube_id === 'cTlY4dDk0aQ');

check('judul kosong ditolak', !!helpers.buildTaskData({ ...validPayload, judul: '  ' }).error);
check('tautan YouTube tidak valid ditolak', !!helpers.buildTaskData({ ...validPayload, youtube_id: 'https://contoh.com/video' }).error);
check('tanpa soal ditolak', !!helpers.buildTaskData({ ...validPayload, soal: [] }).error);
check('kunci di luar jumlah opsi ditolak', !!helpers.buildTaskData({
  ...validPayload,
  soal: [{ waktu: 5, pertanyaan: 'Pilih', opsi: ['A', 'B'], kunci: 3 }]
}).error);
check('opsi kurang dari 2 ditolak', !!helpers.buildTaskData({
  ...validPayload,
  soal: [{ waktu: 5, pertanyaan: 'Pilih', opsi: ['A'], kunci: 0 }]
}).error);
check('opsi lebih dari 5 ditolak', !!helpers.buildTaskData({
  ...validPayload,
  soal: [{ waktu: 5, pertanyaan: 'Pilih', opsi: ['A', 'B', 'C', 'D', 'E', 'F'], kunci: 0 }]
}).error);
check('waktu soal melebihi durasi ditolak', !!helpers.buildTaskData({
  ...validPayload,
  durasi: 20,
  soal: [{ waktu: 60, pertanyaan: 'Pilih', opsi: ['A', 'B'], kunci: 0 }]
}).error);

const soal = built.data.soal;
check('publicVideoTask menyembunyikan kunci & pembahasan', (() => {
  const publicTask = JSON.stringify(helpers.publicVideoTask({ id: 'x', soal }));
  return !publicTask.includes('kunci') && !publicTask.includes('pembahasan');
})());
check('publicVideoTask admin tetap memuat kunci', JSON.stringify(helpers.publicVideoTask({ id: 'x', soal }, true)).includes('"kunci"'));

const graded = helpers.gradeVideoAnswers(soal, { [soal[0].id]: soal[0].kunci, [soal[1].id]: soal[1].kunci });
check('penilaian menjawab benar semua = 100', graded.benar === 2 && graded.score === 100, `skor=${graded.score}`);
const wrongKey = (soal[1].kunci + 1) % soal[1].opsi.length;
const gradedHalf = helpers.gradeVideoAnswers(soal, { [soal[0].id]: soal[0].kunci, [soal[1].id]: wrongKey });
check('penilaian satu benar = 50', gradedHalf.score === 50, `skor=${gradedHalf.score}`);
check('jawaban kosong terdeteksi', helpers.missingAnswers(soal, { [soal[0].id]: 0 }) === 1);
check('batas tonton memakai durasi video', helpers.requiredWatchSeconds({ durasi: 120, soal }) === 117);

// ---------- 1a. Soal uraian: kemiripan & relevansi ----------
const essaySoal = {
  tipe: 'uraian',
  kunci_uraian: 'Penghentian proyek tidak menutup kanal sehingga gambut tetap kering dan rentan terbakar pada musim kemarau.',
  kata_kunci: ['kanal', 'gambut kering', 'musim kemarau', 'rentan terbakar']
};
const essayExact = helpers.scoreEssayAnswer(essaySoal, essaySoal.kunci_uraian);
check('uraian: jawaban identik bernilai 1',
  essayExact.poin === 1 && essayExact.kemiripan === 100 && essayExact.relevansi === 100,
  `poin=${essayExact.poin} mirip=${essayExact.kemiripan} relevan=${essayExact.relevansi}`);
const essayGood = helpers.scoreEssayAnswer(essaySoal, 'Karena kanal tidak ditutup, lahan gambut kering dan mudah terbakar saat kemarau panjang.');
check('uraian: parafrase relevan mendapat nilai sebagian',
  essayGood.poin > 0.4 && essayGood.poin < 1, `poin=${essayGood.poin} relevan=${essayGood.relevansi}`);
const essayBad = helpers.scoreEssayAnswer(essaySoal, 'Karena proyek dihentikan oleh presiden.');
check('uraian: jawaban tidak relevan hampir 0', essayBad.poin <= 0.05, `poin=${essayBad.poin}`);
check('uraian: kata kunci hilang terdeteksi', essayBad.kata_hilang.length === 4);
check('uraian: jawaban kosong bernilai 0', helpers.scoreEssayAnswer(essaySoal, '').poin === 0);

const essayPayload = {
  judul: 'Uji Uraian',
  youtube_id: 'cTlY4dDk0aQ',
  durasi: 60,
  soal: [{
    tipe: 'uraian',
    waktu: 10,
    pertanyaan: 'Jelaskan mekanisme kebakaran gambut.',
    kunci_uraian: 'Kanal mengeringkan gambut sehingga gambut kering dan rentan terbakar saat kemarau.',
    kata_kunci: ['kanal', 'gambut kering', 'kemarau']
  }]
};
const essayBuilt = helpers.buildTaskData(essayPayload);
check('payload uraian valid diterima', !essayBuilt.error && essayBuilt.data.soal[0].tipe === 'uraian', essayBuilt.error || '');
check('uraian tanpa kunci acuan ditolak', !!helpers.buildTaskData({
  ...essayPayload,
  soal: [{ tipe: 'uraian', waktu: 5, pertanyaan: 'Jelaskan?' }]
}).error);
check('uraian tanpa kata kunci ditolak', !!helpers.buildTaskData({
  ...essayPayload,
  soal: [{ tipe: 'uraian', waktu: 5, pertanyaan: 'Jelaskan?', kunci_uraian: 'Jawaban acuan yang cukup panjang untuk validasi sistem.' }]
}).error);
check('publicVideoTask menyembunyikan kunci uraian',
  !JSON.stringify(helpers.publicVideoTask({ id: 'x', soal: essayBuilt.data.soal })).includes('kunci_uraian'));
check('missingAnswers mendeteksi uraian kosong', helpers.missingAnswers(essayBuilt.data.soal, {}) === 1);
const mixed = helpers.gradeVideoAnswers([...soal, essayBuilt.data.soal[0]], {
  [soal[0].id]: soal[0].kunci,
  [soal[1].id]: soal[1].kunci,
  [essayBuilt.data.soal[0].id]: essayBuilt.data.soal[0].kunci_uraian
});
check('nilai campuran PG + uraian = 100', mixed.score === 100, `skor=${mixed.score}`);

// ---------- 1b. Kunci anti-skip di sisi pemutar ----------
const clientSource = fs.readFileSync(path.join(root, 'public/assets/js/video-task.js'), 'utf8');
const clientSandbox = {
  console,
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  setInterval: () => 0,
  clearInterval: () => {},
  fetch: async () => ({ ok: true, json: async () => ({}) })
};
clientSandbox.window = clientSandbox;
vm.createContext(clientSandbox);
try {
  vm.runInContext(clientSource, clientSandbox);
  check('video-task.js siswa dapat dimuat', typeof clientSandbox.vtRenderList === 'function');
  check('lompatan ke depan terdeteksi sebagai skip', clientSandbox.vtIsSkip(45, 12) === true);
  check('pemutaran normal tidak dianggap skip', clientSandbox.vtIsSkip(12.8, 12) === false);
} catch (error) {
  check('video-task.js siswa dapat dimuat', false, error.message);
}

// ---------- 1c. Keterkaitan UI: id yang dipakai skrip harus ada di HTML ----------
const adminHtml = fs.readFileSync(path.join(root, 'public', 'admin.html'), 'utf8');
const studentHtml = fs.readFileSync(path.join(root, 'public', 'student.html'), 'utf8');
const adminScript = fs.readFileSync(path.join(root, 'public/assets/js/video-task-admin.js'), 'utf8');
const referencedIds = [...new Set([...adminScript.matchAll(/getElementById\('([^']+)'\)/g)].map(match => match[1]))];
// Sebagian elemen dibuat dinamis oleh modal rekap, jadi tidak ada di admin.html.
const dynamicResultIds = new Set([
  'vt-filter-kelas', 'vt-filter-status', 'vt-filter-nilai',
  'vt-result-summary', 'vt-result-list', 'btn-print-result'
]);
const missingIds = referencedIds.filter(id => !dynamicResultIds.has(id) && !adminHtml.includes(`id="${id}"`));
check('semua id tugas video tersedia di admin.html', missingIds.length === 0, missingIds.join(', '));
check('area cetak & fungsi cetak tersedia',
  adminHtml.includes('id="vt-print-area"') && adminScript.includes('function printResultReport'));
check('menu & section tugas video ada di admin.html',
  adminHtml.includes('data-menu="video-tasks"') && adminHtml.includes('id="menu-video-tasks"'));
check('menu & section tugas video ada di student.html',
  studentHtml.includes('data-nav="video-tugas"') && studentHtml.includes('id="sec-video-tugas"') && studentHtml.includes('id="vt-root"'));
check('skrip video-task.js dimuat di student.html', studentHtml.includes('assets/js/video-task.js'));
check('skrip video-task-admin.js dimuat di admin.html', adminHtml.includes('assets/js/video-task-admin.js'));
check('menu admin memakai renderer tugas video', fs.readFileSync(path.join(root, 'public/assets/js/admin.js'), 'utf8').includes("'video-tasks': { title: 'Tugas Video', render: () => renderVideoTasks() }"));
check('modal preview & tombol bagikan tersedia di admin.html',
  adminHtml.includes('id="video-task-preview-modal"') && adminHtml.includes('id="btn-share-video-task-modal"'));
check('skrip admin memuat fitur preview & bagikan',
  adminScript.includes('function openPreview') && adminScript.includes('function shareTask'));
check('tautan share ?task didukung pemutar siswa',
  clientSource.includes("get('task')") && clientSource.includes('vtOpenTask'));
check('login menyimpan tujuan tugas sebelum redirect',
  fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8').includes('lms_next_task'));

// ---------- 2. Alur API (end-to-end) ----------
const db = JSON.parse(fs.readFileSync(path.join(root, 'data', 'db.json'), 'utf8'));
const tenant = (db.tenants || [])[0];
if (!tenant) throw new Error('Tidak ada tenant pada data/db.json');

const klass = (db.classes || []).find(c => c.tenant_id === tenant.id);
if (!klass) throw new Error('Tidak ada kelas pada data/db.json');

const fixtureAdmin = (db.users || []).find(u => u.role === 'admin' || u.role === 'super_admin');
if (!fixtureAdmin) throw new Error('Tidak ada akun admin pada data/db.json');
fixtureAdmin.password = bcrypt.hashSync('admin123', 8);
fixtureAdmin.tenant_id = tenant.id;

const password = bcrypt.hashSync('rahasia123', 8);
db.students = [
  {
    id: 'siswa-video-a', tenant_id: tenant.id, nama: 'Siswa Video A', nis: 'VID-A',
    username: 'video.a', email: 'video.a@uji.local', class_id: klass.id, password
  },
  {
    id: 'siswa-video-b', tenant_id: tenant.id, nama: 'Siswa Video B', nis: 'VID-B',
    username: 'video.b', email: 'video.b@uji.local', class_id: klass.id, password
  }
];
db.users = db.users.filter(u => String(u.email || '').indexOf('@uji.local') === -1);
db.video_tasks = [];
db.video_attempts = [];
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

const server = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), LMS_DB_PATH: dbPath, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let log = '';
server.stdout.on('data', chunk => { log += chunk.toString(); });
server.stderr.on('data', chunk => { log += chunk.toString(); });

async function waitForServer(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/me`);
      if (res.status > 0) return true;
    } catch { /* belum siap */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return false;
}

const cookies = { admin: '', student: '', other: '' };

async function request(method, url, body, as = 'student') {
  const headers = { 'Content-Type': 'application/json' };
  if (cookies[as]) headers.Cookie = cookies[as];
  const res = await fetch(BASE + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (setCookie.length) cookies[as] = setCookie.join('; ');
  return { status: res.status, data };
}

let exitCode = 1;
try {
  const ready = await waitForServer();
  check('server uji berjalan', ready, ready ? '' : log.slice(0, 200));
  if (!ready) throw new Error('server tidak siap');

  const adminLogin = await request('POST', '/api/login', { email: fixtureAdmin.email, password: 'admin123' }, 'admin');
  check('login admin berhasil', adminLogin.status === 200, `status=${adminLogin.status}`);

  const studentLogin = await request('POST', '/api/student/login', { username: 'video.a', password: 'rahasia123' }, 'student');
  check('login siswa berhasil', studentLogin.status === 200, `status=${studentLogin.status}`);

  const created = await request('POST', '/api/admin/video-tasks', {
    judul: 'Mengamati Siklus Hidrologi',
    deskripsi: 'Tonton hingga selesai.',
    youtube_id: 'cTlY4dDk0aQ',
    durasi: 120,
    class_id: klass.id,
    soal: [
      { waktu: 10, pertanyaan: 'Apa nama siklus air?', opsi: ['Siklus karbon', 'Siklus hidrologi', 'Siklus batuan'], kunci: 1, pembahasan: 'Siklus air = hidrologi.' },
      { waktu: 40, pertanyaan: 'Proses air menguap disebut?', opsi: ['Evaporasi', 'Presipitasi', 'Infiltrasi'], kunci: 0, pembahasan: 'Penguapan = evaporasi.' },
      { waktu: 80, tipe: 'uraian', pertanyaan: 'Jelaskan mengapa kanal membuat gambut rentan terbakar.', kunci_uraian: 'Kanal mengeringkan gambut sehingga gambut kering dan rentan terbakar saat musim kemarau.', kata_kunci: ['kanal', 'gambut kering', 'kemarau'], pembahasan: 'Kanal menurunkan kelembapan gambut.' }
    ]
  }, 'admin');
  check('admin dapat membuat tugas video', created.status === 200 && created.data.id, `status=${created.status}`);
  const taskId = created.data.id;
  check('kunci jawaban tersimpan di server', Array.isArray(created.data.soal) && created.data.soal[0].kunci === 1);
  check('kunci uraian tersimpan di server', created.data.soal.some(item => item.tipe === 'uraian' && item.kunci_uraian));

  const list = await request('GET', '/api/video-tasks', undefined, 'student');
  check('siswa melihat tugas video kelasnya', list.status === 200 && list.data.some(t => t.id === taskId), `status=${list.status}`);
  check('daftar tugas siswa tidak membocorkan kunci', !JSON.stringify(list.data).includes('"kunci"'));
  check('daftar tugas siswa tidak membocorkan pembahasan', !JSON.stringify(list.data).includes('"pembahasan"'));

  const detail = await request('GET', `/api/video-tasks/${taskId}`, undefined, 'student');
  check('detail tugas siswa tanpa kunci', detail.status === 200 && !JSON.stringify(detail.data).includes('"kunci"'));
  check('detail tugas siswa tanpa pembahasan', !JSON.stringify(detail.data).includes('"pembahasan"'));
  check('detail tugas siswa tanpa kunci uraian', !JSON.stringify(detail.data).includes('kunci_uraian') && !JSON.stringify(detail.data).includes('kata_kunci'));
  check('detail memuat batas tonton', detail.status === 200 && detail.data.required_watch_seconds === 117, `required=${detail.data.required_watch_seconds}`);

  const emptySubmit = await request('POST', `/api/video-tasks/${taskId}/attempt`, { answers: {}, watched_seconds: 120, position: 120 }, 'student');
  check('kiriman tanpa jawaban ditolak', emptySubmit.status === 400, `status=${emptySubmit.status}`);

  const answers = {};
  detail.data.soal.forEach(item => {
    if (item.tipe === 'uraian') {
      answers[item.id] = 'Kanal mengeringkan gambut sehingga gambut kering dan rentan terbakar saat musim kemarau.';
      return;
    }
    answers[item.id] = item.pertanyaan.includes('menguap') ? 0 : 1;
  });

  const skipSubmit = await request('POST', `/api/video-tasks/${taskId}/attempt`, { answers, watched_seconds: 12, position: 12 }, 'student');
  check('video yang dilewati tidak bisa dinilai', skipSubmit.status === 400, `status=${skipSubmit.status}`);

  const first = await request('POST', `/api/video-tasks/${taskId}/attempt`, { answers, watched_seconds: 120, position: 120 }, 'student');
  check('jawaban lengkap mendapat nilai 100', first.status === 200 && first.data.score === 100, `status=${first.status} skor=${first.data.score}`);
  check('hasil mengembalikan kunci & pembahasan', Array.isArray(first.data.hasil) && first.data.hasil.every(item => item.kunci !== undefined));
  const essayResult = (first.data.hasil || []).find(item => item.tipe === 'uraian');
  check('hasil uraian memuat kemiripan & relevansi',
    !!essayResult && essayResult.kemiripan === 100 && essayResult.relevansi === 100 && essayResult.poin === 1,
    essayResult ? `mirip=${essayResult.kemiripan} relevan=${essayResult.relevansi} poin=${essayResult.poin}` : 'tidak ada');

  const wrongAnswers = {};
  detail.data.soal.forEach(item => { wrongAnswers[item.id] = item.tipe === 'uraian' ? 'Tidak tahu.' : 0; });
  const second = await request('POST', `/api/video-tasks/${taskId}/attempt`, { answers: wrongAnswers, watched_seconds: 120, position: 120 }, 'student');
  check('percobaan kedua tercatat & nilai terbaik dipertahankan',
    second.status === 200 && second.data.best_score === 100 && second.data.ke === 2,
    `status=${second.status} best=${second.data.best_score} ke=${second.data.ke}`);

  const grades = await request('GET', `/api/grades?student_id=siswa-video-a`, undefined, 'admin');
  const videoGrade = (grades.data || []).find(item => item.tipe === 'Tugas Video');
  check('nilai tugas video masuk rekap nilai', !!videoGrade && videoGrade.nilai === 100, `grade=${videoGrade ? videoGrade.nilai : 'tidak ada'}`);

  const otherLogin = await request('POST', '/api/student/login', { username: 'video.b', password: 'rahasia123' }, 'other');
  check('login siswa lain berhasil', otherLogin.status === 200, `status=${otherLogin.status}`);

  const restricted = await request('POST', '/api/admin/video-tasks', {
    judul: 'Kelas Lain',
    youtube_id: 'cTlY4dDk0aQ',
    durasi: 60,
    class_id: 'kelas-lain',
    soal: [{ waktu: 5, pertanyaan: 'Pilih', opsi: ['A', 'B'], kunci: 0 }]
  }, 'admin');
  check('admin membuat tugas kelas lain', restricted.status === 200);

  const otherList = await request('GET', '/api/video-tasks', undefined, 'other');
  check('tugas kelas lain tidak terlihat', otherList.status === 200 && !otherList.data.some(t => t.id === restricted.data.id));

  const otherDetail = await request('GET', `/api/video-tasks/${restricted.data.id}`, undefined, 'other');
  check('detail tugas kelas lain ditolak', otherDetail.status === 403, `status=${otherDetail.status}`);

  const forbiddenCreate = await request('POST', '/api/admin/video-tasks', { judul: 'X' }, 'student');
  check('siswa tidak bisa membuat tugas video', forbiddenCreate.status === 403, `status=${forbiddenCreate.status}`);

  const resultsResponse = await request('GET', `/api/admin/video-tasks/${taskId}/hasil`, undefined, 'admin');
  check('admin melihat rekap hasil siswa',
    resultsResponse.status === 200 && resultsResponse.data.attempts.length === 2
    && resultsResponse.data.attempts[0].student_nama === 'Siswa Video A',
    `status=${resultsResponse.status} attempts=${resultsResponse.data.attempts ? resultsResponse.data.attempts.length : 0}`);
  const recapStudents = resultsResponse.data.students || [];
  const recapA = recapStudents.find(item => item.student_id === 'siswa-video-a');
  const recapB = recapStudents.find(item => item.student_id === 'siswa-video-b');
  check('rekap memuat siswa yang belum mengerjakan',
    recapStudents.length === 2 && recapB && recapB.status === 'belum' && recapB.best_score === null,
    `siswa=${recapStudents.length}`);
  check('rekap memuat nama kelas & status mengerjakan',
    !!recapA && recapA.status === 'sudah' && recapA.class_nama === klass.nama && recapA.best_score === 100,
    recapA ? `kelas=${recapA.class_nama} status=${recapA.status} nilai=${recapA.best_score}` : 'tidak ada');
  check('rekap menyediakan daftar kelas untuk filter',
    Array.isArray(resultsResponse.data.classes)
    && resultsResponse.data.classes.some(item => item.id === klass.id && item.nama === klass.nama));

  const updated = await request('PUT', `/api/admin/video-tasks/${taskId}`, {
    judul: 'Mengamati Siklus Hidrologi (Revisi)',
    youtube_id: 'cTlY4dDk0aQ',
    durasi: 120,
    class_id: klass.id,
    soal: [{ waktu: 15, pertanyaan: 'Revisi soal?', opsi: ['Ya', 'Tidak'], kunci: 0 }]
  }, 'admin');
  check('admin dapat mengubah tugas video', updated.status === 200 && updated.data.judul.includes('Revisi'), `status=${updated.status}`);

  const removed = await request('DELETE', `/api/admin/video-tasks/${taskId}`, undefined, 'admin');
  check('admin dapat menghapus tugas video', removed.status === 200);

  const afterDelete = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  check('percobaan ikut terhapus bersama tugas',
    !(afterDelete.video_tasks || []).some(t => t.id === taskId)
    && !(afterDelete.video_attempts || []).some(a => a.task_id === taskId));

  exitCode = results.every(item => item.ok) ? 0 : 1;
} catch (error) {
  console.error('\nUji gagal:', error.message);
  console.error(log.slice(-1500));
  exitCode = 1;
} finally {
  server.kill();
  await new Promise(resolve => setTimeout(resolve, 300));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* bersihkan sebisanya */ }
  const failed = results.filter(item => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} uji lulus`);
  process.exit(exitCode);
}
