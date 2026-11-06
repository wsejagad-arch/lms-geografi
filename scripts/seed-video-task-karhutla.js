// Seed tugas "Tugas Mengamati Video" untuk video Watchdoc Image:
// "Rekam Jejak Kebakaran Hutan & Lahan Tiga Dekade | MERAWAT INGATAN"
// https://www.youtube.com/watch?v=Fy9vM5xoY2M (durasi 523 detik)
//
// 15 soal analisis (HOTS) yang jawabannya hanya bisa ditemukan dari isi video.
// Jalankan: node scripts/seed-video-task-karhutla.js [--class "Nama Kelas"] [--force]
// Tanpa --class, tugas tampil untuk semua kelas.
const path = require('path');
const fs = require('fs');
const dataStore = require('../data-store');
const { buildTaskData } = require('../video-task');

const TASK_ID = 'video-karhutla-tiga-dekade';
const YOUTUBE_ID = 'Fy9vM5xoY2M';
const DURATION = 523;

const SOAL = [
  {
    waktu: 55,
    pertanyaan: 'Kebakaran di Merauke disebut memiliki "riwayat penyebab yang serupa" dengan kebakaran masa lalu di Kalimantan dan Sumatra. Analisis yang paling tepat atas pernyataan tersebut adalah ...',
    opsi: [
      'Karena api menyebar mengikuti angin muson yang sama di ketiga wilayah',
      'Karena ketiganya selalu terjadi pada bulan yang sama setiap tahun',
      'Karena ketiganya berawal dari pembukaan lahan skala besar untuk program pangan dan kepentingan industri',
      'Karena Merauke memiliki jenis tanah yang identik dengan Kalimantan'
    ],
    kunci: 2,
    pembahasan: 'Konsep 1 — Perubahan penggunaan lahan. Video menyebut alih fungsi lahan dan hutan untuk kepentingan industri (0:26) serta pembukaan lahan skala besar, sehingga Merauke mengalami pola penyebab yang mirip dengan Kalimantan dan Sumatra (0:50).'
  },
  {
    waktu: 115,
    pertanyaan: 'Dalam video, pembukaan lahan gambut selalu disertai pembuatan kanal. Mengapa kanal menjadi kunci, dan apa dampaknya terhadap lahan gambut?',
    opsi: [
      'Kanal mengalirkan air ke sawah sehingga gambut tetap basah sepanjang tahun',
      'Kanal menampung dan mengalirkan air keluar dari gambut sehingga lahan mengering dan rentan terbakar',
      'Kanal menahan sedimen agar tanah gambut tetap subur untuk padi',
      'Kanal menurunkan suhu tanah agar tanaman padi tumbuh lebih cepat'
    ],
    kunci: 1,
    pembahasan: 'Konsep 2 — Ekosistem gambut dan hidrologi. Gambut yang basah harus dikeringkan lewat kanal; kanal menampung air dari area gambut (1:45–1:53), sehingga gambut kehilangan kelembapan dan mudah terbakar saat kemarau.'
  },
  {
    waktu: 163,
    pertanyaan: 'Video menyebut kombinasi yang memicu kebakaran skala besar di lahan gambut. Kombinasi yang dimaksud adalah ...',
    opsi: [
      'Curah hujan tinggi, kanal, dan El Niño',
      'Gempa, kemarau, dan alih fungsi lahan',
      'Angin muson, pasang surut, dan kanal',
      'Kanal, gambut kering, kemarau panjang, dan El Niño'
    ],
    kunci: 3,
    pembahasan: 'Konsep 3 — Interaksi faktor iklim dan manusia. Narasi video menyebut kanal, gambut kering, kemarau panjang, ditambah El Niño sebagai kombinasi kebakaran skala besar (2:38–2:46). Faktor alam tidak bekerja sendiri.'
  },
  {
    waktu: 180,
    pertanyaan: 'Video menyatakan luas area terbakar tahun 1997 "sekitar 2 juta hektar atau setara 30 kali luas Jakarta". Fungsi perbandingan tersebut dalam analisis geografi adalah ...',
    opsi: [
      'Membandingkan luas area terbakar dengan luas kota agar skala kerusakan lebih mudah dibayangkan',
      'Menjelaskan luas wilayah proyek PLG yang direncanakan',
      'Menyebut luas lahan gambut yang masih basah setelah kebakaran',
      'Menjelaskan target pembukaan lahan baru di Merauke'
    ],
    kunci: 0,
    pembahasan: 'Konsep 4 — Skala dan kuantifikasi spasial. Angka 2 juta hektar (2:56–3:00) diperbandingkan dengan 30 kali luas Jakarta untuk memberi gambaran besaran kerusakan, bukan untuk menyebut luas PLG atau target Merauke.'
  },
  {
    waktu: 218,
    pertanyaan: 'PLG dihentikan Presiden BJ Habibie pada 1998, tetapi kebakaran tetap berulang. Mengapa penghentian proyek tidak otomatis menghentikan kebakaran?',
    opsi: [
      'Karena proyek dilanjutkan kembali dengan nama lain pada tahun yang sama',
      'Karena El Niño berhenti tepat setelah 1998 sehingga lahan menjadi kering',
      'Karena kanal tetap ada dan gambut yang sudah mengering tetap rentan terbakar ketika musim kering',
      'Karena seluruh perusahaan langsung berhenti beroperasi di lahan gambut'
    ],
    kunci: 2,
    pembahasan: 'Konsep 5 — Kebijakan pembangunan berkelanjutan. Video menjelaskan bahwa luas gambut yang telanjur mengering membuat kawasan tetap rentan terbakar saat musim kering meski proyek dihentikan (3:32–3:41).'
  },
  {
    waktu: 230,
    pertanyaan: 'Deretan tahun kebakaran 2002, 2006, 2009, 2014, dan 2015 yang ditampilkan video paling tepat menunjukkan bahwa ...',
    opsi: [
      'Kebakaran hanya terjadi satu kali dalam satu dekade',
      'Dampak pengeringan gambut bersifat jangka panjang dan berulang, bukan kejadian tunggal',
      'Kebakaran terjadi setiap bulan tanpa jeda',
      'Kebakaran hanya dipicu oleh El Niño pada tahun-tahun tersebut'
    ],
    kunci: 1,
    pembahasan: 'Konsep 6 — Kerentanan dan risiko berulang. Video menyebut rentetan tahun kebakaran setelah PLG dihentikan (3:44–3:50) sebagai bukti kerentanan yang menetap, bukan peristiwa sekali jadi.'
  },
  {
    waktu: 278,
    pertanyaan: 'Hingga 2021 pemerintah memberikan izin konsesi lahan gambut seluas 5,2 juta hektar. Wilayah yang mendominasi pengelolaan dan peruntukannya menurut video adalah ...',
    opsi: [
      'Kalimantan Tengah, terutama untuk persawahan rakyat',
      'Papua, terutama untuk lumbung pangan nasional',
      'Sulawesi, terutama untuk tambak dan perkebunan kakao',
      'Sumatra—khususnya Sumsel, Riau, dan Jambi—untuk sawit dan tanaman industri'
    ],
    kunci: 3,
    pembahasan: 'Konsep 7 — Tata guna lahan dan konsesi. Video menyebut Sumatra, khususnya Sumsel, Riau, dan Jambi, mendominasi izin konsesi gambut untuk sawit dan tanaman industri (4:30–4:49).'
  },
  {
    waktu: 325,
    pertanyaan: 'Selain denda, tindakan yang disebut video terhadap perusahaan yang terbukti membakar lahan atau lalai menjaga wilayahnya adalah ...',
    opsi: [
      'Izinnya dicabut',
      'Diberi kompensasi kerugian',
      'Dipindahkan konsesinya ke Merauke',
      'Diberi izin konsesi baru sebagai pengganti'
    ],
    kunci: 0,
    pembahasan: 'Konsep 8 — Penegakan hukum dan akuntabilitas lingkungan. Video menyebut selain denda, beberapa perusahaan dicabut izinnya karena terbukti membakar atau lalai menjaga wilayahnya (5:20–5:29).'
  },
  {
    waktu: 345,
    pertanyaan: 'Sekelompok masyarakat menggugat penyelenggara negara, dari kepala daerah hingga presiden. Alasan gugatan tersebut menurut video adalah ...',
    opsi: [
      'Menetapkan harga lahan yang terlalu tinggi bagi masyarakat',
      'Dianggap lalai dalam mencegah, menangani, dan menanggulangi kebakaran hutan dan lahan',
      'Tidak membangun kanal di seluruh area gambut',
      'Tidak memberikan izin konsesi kepada perusahaan'
    ],
    kunci: 1,
    pembahasan: 'Konsep 8 — Penegakan hukum dan akuntabilitas lingkungan. Gugatan ditujukan karena penyelenggara negara dianggap lalai mencegah, menangani, dan menanggulangi karhutla (5:31–5:45).'
  },
  {
    waktu: 385,
    pertanyaan: 'Data "49.000 hektar lahan sudah dibuka dari target 1 hingga 2 juta hektar" di Merauke menunjukkan bahwa ...',
    opsi: [
      'Program pembukaan lahan telah selesai seluruhnya',
      'Program tersebut dibatalkan sebelum berjalan',
      'Baru sebagian kecil target yang dibuka, dan area itu mencakup lahan mineral serta gambut',
      'Seluruh area yang dibuka merupakan lahan gambut'
    ],
    kunci: 2,
    pembahasan: 'Konsep 4 — Skala dan kuantifikasi spasial. Video menyebut 49.000 ha dari target 1–2 juta ha, mencakup lahan mineral dan gambut (6:14–6:26), sehingga progresnya masih kecil dari target.'
  },
  {
    waktu: 405,
    pertanyaan: 'Menurut video, pembukaan hutan hujan tropis di lahan mineral juga membuat lahan rentan terbakar karena ...',
    opsi: [
      'Pohon sebagai payung hilang sehingga air menguap dan lahan mengering oleh paparan sinar matahari langsung',
      'Hutan menambah bahan bakar sehingga api cepat membesar',
      'Tanah mineral selalu kering sepanjang tahun tanpa perlu dibuka',
      'Hujan berhenti total setelah penebangan hutan'
    ],
    kunci: 0,
    pembahasan: 'Konsep 9 — Deforestasi dan siklus air. Video menjelaskan hilangnya pohon sebagai payung membuat area yang tadinya basah menguap dan mengering karena sinar matahari langsung (6:38–6:52).'
  },
  {
    waktu: 428,
    pertanyaan: 'Greenpeace Indonesia menemukan 284 titik kebakaran di Merauke, dan 274 di antaranya berada di dalam area PSN. Temuan ini paling tepat menggambarkan ...',
    opsi: [
      'Kebakaran tersebar merata di seluruh wilayah Papua',
      'Titik kebakaran tidak berhubungan dengan keberadaan proyek',
      'Kebakaran hanya terjadi pada lahan gambut, bukan lahan mineral',
      'Kebakaran terkonsentrasi secara spasial di dalam wilayah proyek'
    ],
    kunci: 3,
    pembahasan: 'Konsep 10 — Pola spasial, mitigasi, dan inovasi. Hampir seluruh titik api (274 dari 284) berada di dalam area PSN (6:59–7:05), menunjukkan konsentrasi spasial risiko di wilayah proyek.'
  },
  {
    waktu: 440,
    pertanyaan: 'Video menegaskan "kemarau panjang atau El Niño bukan faktor tunggal" terjadinya karhutla. Pernyataan itu paling tepat dimaknai sebagai ...',
    opsi: [
      'El Niño tidak pernah memengaruhi kebakaran hutan dan lahan',
      'Karhutla hanya disebabkan oleh aktivitas manusia',
      'Karhutla terjadi karena interaksi faktor iklim dan faktor manusia seperti pengeringan serta pembukaan lahan',
      'Faktor iklim sama sekali tidak relevan terhadap karhutla'
    ],
    kunci: 2,
    pembahasan: 'Konsep 3 — Interaksi faktor iklim dan manusia. Video tetap mengakui kemarau/El Niño sebagai pemicu, tetapi bukan satu-satunya; pengeringan gambut dan pembukaan lahan menjadi faktor manusia yang memperparah (7:16–7:20).'
  },
  {
    waktu: 468,
    pertanyaan: 'Video menilai pemadaman api dan modifikasi cuaca belum cukup untuk menyelesaikan masalah karhutla karena ...',
    opsi: [
      'Biayanya terlalu mahal bagi pemerintah daerah',
      'Hanya menjawab bagaimana api bisa padam, bukan akar persoalan agar kebakaran tidak terulang',
      'Tidak melibatkan perusahaan yang memiliki konsesi',
      'Tidak menggunakan teknologi yang modern'
    ],
    kunci: 1,
    pembahasan: 'Konsep 10 — Pola spasial, mitigasi, dan inovasi. Video menyebut pemadaman dan modifikasi cuaca hanya menjawab bagaimana api padam, tetapi tidak menjawab akar persoalan agar kebakaran tak terulang (7:39–7:48).'
  },
  {
    waktu: 510,
    pertanyaan: 'Di akhir video dibahas inovasi "ubi bombing" sebagai upaya meredam api. Yang dimaksud dengan inovasi tersebut adalah ...',
    opsi: [
      'Penggunaan tepung berbahan ubi/singkong untuk meredam api',
      'Penanaman ubi di lahan gambut agar lahan tidak terbakar',
      'Penjatuhan bom air dari pesawat ke titik api',
      'Program pangan berbasis ubi untuk masyarakat terdampak'
    ],
    kunci: 0,
    pembahasan: 'Konsep 10 — Pola spasial, mitigasi, dan inovasi. Video menyebut tepung berbahan ubi/singkong yang dapat meredam api dan rencana produksi skala besar, yang kemudian disebut "ubi bombing" (7:53–8:32).'
  },
  {
    waktu: 240,
    tipe: 'uraian',
    pertanyaan: 'Berdasarkan kasus PLG, jelaskan mengapa penghentian proyek pada 1998 tidak otomatis menghilangkan risiko kebakaran. Kaitkan kanal, kondisi gambut, dan musim kemarau dalam jawaban Anda.',
    kunci_uraian: 'Penghentian proyek tidak menutup kanal yang sudah dibangun. Kanal terus mengeringkan lahan gambut sehingga gambut tetap kering. Ketika musim kemarau atau El Nino datang, gambut kering menjadi sangat rentan terbakar dan api mudah menyebar, sehingga kebakaran berulang pada tahun-tahun berikutnya.',
    kata_kunci: ['kanal', 'gambut kering', 'musim kemarau', 'rentan terbakar', 'berulang'],
    pembahasan: 'Konsep 5–6 — Kebijakan berkelanjutan dan risiko berulang. Jawaban perlu menjelaskan rantai: kanal tetap ada → gambut terus mengering → kemarau/El Nino → rentan dan berulang (3:32–3:50).'
  },
  {
    waktu: 448,
    tipe: 'uraian',
    pertanyaan: 'Bandingkan mekanisme pemicu kebakaran pada lahan gambut dan lahan mineral seperti dijelaskan video. Mengapa keduanya bisa berujung pada lahan yang mudah terbakar?',
    kunci_uraian: 'Pada lahan gambut, kanalisasi mengeringkan gambut sehingga mudah terbakar. Pada lahan mineral, pembukaan hutan menghilangkan tutupan pohon sebagai payung; air menguap dan lahan menjadi kering karena paparan sinar matahari langsung. Keduanya menciptakan kondisi kering yang memicu kebakaran.',
    kata_kunci: ['kanalisasi', 'gambut', 'tutupan pohon', 'penguapan', 'sinar matahari', 'lahan mineral'],
    pembahasan: 'Konsep 9 — Deforestasi dan siklus air. Bedakan mekanisme gambut (kanal) dan mineral (hilangnya payung pohon → penguapan → kering) (5:50–6:52).'
  },
  {
    waktu: 480,
    tipe: 'uraian',
    pertanyaan: 'Video menyimpulkan pemadaman api dan modifikasi cuaca belum menyelesaikan akar masalah karhutla. Evaluasi pernyataan tersebut, lalu usulkan satu kebijakan preventif yang sesuai dengan kasus PLG/Merauke.',
    kunci_uraian: 'Pemadaman dan modifikasi cuaca hanya menangani api yang sudah terjadi, bukan penyebabnya. Akar masalahnya adalah pengeringan gambut melalui kanal dan pembukaan lahan skala besar. Kebijakan preventif yang sesuai adalah menghentikan atau menutup kanal, restorasi gambut, moratorium pembukaan lahan gambut, dan penataan ruang yang melindungi gambut.',
    kata_kunci: ['akar masalah', 'pencegahan', 'kanal', 'restorasi gambut', 'moratorium', 'tata ruang'],
    pembahasan: 'Konsep 10 — Mitigasi dan akar masalah. Jawaban perlu menilai bahwa pemadaman bersifat reaktif, lalu menawarkan kebijakan preventif yang menyasar kanal/pembukaan lahan (7:39–7:48).'
  }
];

function parseArgs(argv) {
  const args = { class: '', force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--force') args.force = true;
    if (argv[i] === '--class') args.class = String(argv[i + 1] || '').trim();
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = process.env.LMS_DB_PATH || path.join(__dirname, '..', 'data', 'db.json');
  // Bila belum ada basis data SQLite, tulis ke db.json; server akan memigrasikannya
  // saat pertama kali dijalankan. Bila SQLite sudah ada, tulis ke sumber kebenaran itu.
  const sqlitePath = process.env.LMS_SQLITE_PATH || dbPath.replace(/\.json$/i, '.sqlite');
  const driver = process.env.LMS_SEED_DRIVER || (fs.existsSync(sqlitePath) ? undefined : 'json');
  await dataStore.init(driver ? { dbPath, driver } : { dbPath });
  const db = await dataStore.loadDB();
  console.log(`[seed] backend=${dataStore.status().backend}`);

  const tenant = db.tenants[0];
  if (!tenant) throw new Error('Tidak ada tenant pada database.');

  let classId = null;
  if (args.class) {
    const needle = args.class.toLowerCase();
    const kelas = db.classes.find(item =>
      String(item.id).toLowerCase() === needle || String(item.nama || '').toLowerCase() === needle
    );
    if (!kelas) throw new Error(`Kelas "${args.class}" tidak ditemukan.`);
    classId = kelas.id;
  }

  const built = buildTaskData({
    judul: 'Karhutla Tiga Dekade: Analisis Geografi dari Kasus PLG hingga Merauke',
    deskripsi: 'Tonton video sampai selesai. Video tidak bisa dilewati dan 18 soal (15 pilihan ganda + 3 uraian HOTS) muncul otomatis pada bagian video yang relevan. Jawaban uraian dinilai otomatis dari kemiripan dan relevansi dengan kunci.',
    youtube_id: YOUTUBE_ID,
    durasi: DURATION,
    class_id: classId,
    soal: SOAL
  });
  if (built.error) throw new Error(built.error);

  if (!Array.isArray(db.video_tasks)) db.video_tasks = [];
  if (!Array.isArray(db.video_attempts)) db.video_attempts = [];

  const existingIndex = db.video_tasks.findIndex(task => task.id === TASK_ID && task.tenant_id === tenant.id);
  const now = new Date().toISOString();
  const adminUser = db.users.find(user => ['admin', 'super_admin'].includes(user.role) && user.tenant_id === tenant.id)
    || db.users.find(user => ['admin', 'super_admin'].includes(user.role));
  if (existingIndex >= 0 && !args.force) {
    console.log(`Tugas "${TASK_ID}" sudah ada. Pakai --force untuk memperbarui.`);
    return;
  }

  if (existingIndex >= 0) {
    db.video_tasks[existingIndex] = {
      ...db.video_tasks[existingIndex],
      ...built.data,
      updated_at: now
    };
    console.log(`Tugas diperbarui: ${TASK_ID} (${built.data.soal.length} soal)`);
  } else {
    db.video_tasks.push({
      id: TASK_ID,
      tenant_id: tenant.id,
      ...built.data,
      created_by: adminUser ? adminUser.id : null,
      created_at: now,
      updated_at: now
    });
    console.log(`Tugas dibuat: ${TASK_ID} (${built.data.soal.length} soal)`);
  }

  await dataStore.saveDB(db);
  console.log(`Video: https://www.youtube.com/watch?v=${YOUTUBE_ID} · durasi ${DURATION} detik`);
  console.log(`Kelas: ${classId ? args.class : 'semua kelas'}`);
  console.log(`Kunci jawaban: ${built.data.soal.map(item => String.fromCharCode(65 + item.kunci)).join(' ')}`);
}

main().catch(error => {
  console.error('Gagal membuat tugas video:', error.message);
  process.exit(1);
});
