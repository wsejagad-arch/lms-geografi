// Membangun paket soal TKA Geografi Kelas X dari sumber ringkas di data/tka/.
// Keluaran:
//   data/kurikulum/kelas-x/09-tka-*.json ... 12-tka-*.json  (dibaca sistem kurikulum)
//   docs/TKA-Geografi-Kelas-X.md                              (versi cetak + kunci)
// Jalankan: node scripts/build-tka-kelas-x.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'data', 'tka');
const OUT_DIR = path.join(ROOT, 'data', 'kurikulum', 'kelas-x');
const DOC_PATH = path.join(ROOT, 'docs', 'TKA-Geografi-Kelas-X.md');

const TIPE_WAJIB = { pg_singkat: 6, pgm: 6, pg_kompleks: 6, menjodohkan: 6, benar_salah: 6 };
const FILES = [
  { paket: 1, nama: '09-tka-sejarah-geografi.json' },
  { paket: 2, nama: '10-tka-objek-konsep-prinsip.json' },
  { paket: 3, nama: '11-tka-pendekatan-geografi.json' },
  { paket: 4, nama: '12-tka-fenomena-mutakhir.json' }
];

const errors = [];
function check(ok, pesan) {
  if (!ok) errors.push(pesan);
  return ok;
}

function letter(index) {
  return String.fromCharCode(65 + index);
}

function plain(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function kunciTeks(soal) {
  if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm') return letter(soal.kunci[0]);
  if (soal.tipe === 'pg_kompleks') return soal.kunci.map(letter).join(', ');
  if (soal.tipe === 'benar_salah') return soal.kunci.join(' - ');
  if (soal.tipe === 'menjodohkan') {
    return soal.kunci.map((v, i) => `${i + 1}-${letter(v)}`).join(', ');
  }
  return '-';
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateSoal(soal, label) {
  const id = soal.id;
  check(soal.pertanyaan && soal.pertanyaan.length >= 30, `${label}: pertanyaan terlalu pendek`);
  check(soal.pembahasan && soal.pembahasan.length >= 60, `${label}: pembahasan terlalu pendek`);
  if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm') {
    check(Array.isArray(soal.opsi) && soal.opsi.length === 5, `${label}: butuh 5 opsi`);
    const minPanjang = soal.tipe === 'pgm' ? 10 : 25;
    (soal.opsi || []).forEach((o, i) => {
      check(String(o).length >= minPanjang, `${label}: opsi ${letter(i)} bukan pernyataan lengkap`);
    });
    check(Array.isArray(soal.kunci) && soal.kunci.length === 1, `${label}: kunci pg harus 1 indeks`);
    check(Number.isInteger(soal.kunci[0]) && soal.kunci[0] >= 0 && soal.kunci[0] < 5, `${label}: kunci pg di luar 0-4`);
  }
  if (soal.tipe === 'pg_kompleks') {
    check(Array.isArray(soal.opsi) && soal.opsi.length === 5, `${label}: butuh 5 opsi`);
    (soal.opsi || []).forEach((o, i) => {
      check(String(o).length >= 25, `${label}: opsi ${letter(i)} bukan pernyataan lengkap`);
    });
    check(Array.isArray(soal.kunci) && soal.kunci.length >= 2 && soal.kunci.length <= 4, `${label}: kunci pg_kompleks 2-4 pilihan`);
    check(new Set(soal.kunci).size === soal.kunci.length, `${label}: kunci pg_kompleks duplikat`);
    soal.kunci.forEach(k => check(Number.isInteger(k) && k >= 0 && k < 5, `${label}: kunci pg_kompleks di luar 0-4`));
  }
  if (soal.tipe === 'benar_salah') {
    check(Array.isArray(soal.pernyataan) && soal.pernyataan.length === 4, `${label}: butuh 4 pernyataan`);
    check(Array.isArray(soal.kunci) && soal.kunci.length === soal.pernyataan.length, `${label}: kunci benar_salah tidak sepanjang pernyataan`);
    (soal.kunci || []).forEach(k => check(k === 'B' || k === 'S', `${label}: kunci benar_salah harus B/S`));
    (soal.pernyataan || []).forEach((p, i) => check(String(p).length >= 30, `${label}: pernyataan ${i + 1} terlalu pendek`));
  }
  if (soal.tipe === 'menjodohkan') {
    check(Array.isArray(soal.kiri) && soal.kiri.length === 5, `${label}: butuh 5 item kiri`);
    check(Array.isArray(soal.kanan) && soal.kanan.length === 5, `${label}: butuh 5 item kanan`);
    check(Array.isArray(soal.kunci) && soal.kunci.length === 5, `${label}: kunci menjodohkan harus 5`);
    check(new Set(soal.kunci).size === 5, `${label}: kunci menjodohkan harus permutasi unik 0-4`);
    (soal.kunci || []).forEach(k => check(Number.isInteger(k) && k >= 0 && k < 5, `${label}: kunci menjodohkan di luar 0-4`));
  }
  return !!id;
}

function buildPaket(def, index) {
  const bab = copy(def.bab);
  const soalList = [];
  let nomor = 0;

  check(Array.isArray(def.klaster) && def.klaster.length === 5, `Paket ${index}: butuh 5 klaster stimulus`);
  (def.klaster || []).forEach((klaster, ki) => {
    const stim = klaster.stimulus || {};
    check(stim.judul && stim.isi, `Paket ${index} klaster ${ki + 1}: stimulus tidak lengkap`);
    check(Array.isArray(klaster.soal) && klaster.soal.length === 6, `Paket ${index} klaster ${ki + 1}: butuh 6 soal`);
    (klaster.soal || []).forEach(item => {
      nomor += 1;
      const soal = copy(item);
      soal.id = `${bab.id}-q${nomor}`;
      soal.stimulus = copy(stim);
      if (!soal.level) soal.level = 'C4';
      if (!soal.literasi) soal.literasi = 'Analisis fenomena geosfer';
      if (!soal.numerasi) soal.numerasi = 'Tidak dominan';
      validateSoal(soal, `${soal.id} (${soal.tipe})`);
      soalList.push(soal);
    });
  });

  const hitung = {};
  soalList.forEach(s => { hitung[s.tipe] = (hitung[s.tipe] || 0) + 1; });
  Object.entries(TIPE_WAJIB).forEach(([tipe, jumlah]) => {
    check(hitung[tipe] === jumlah, `Paket ${index}: ${tipe} ${hitung[tipe] || 0} soal, seharusnya ${jumlah}`);
  });
  check(soalList.length === 30, `Paket ${index}: total ${soalList.length} soal, seharusnya 30`);
  check(new Set(soalList.map(s => s.id)).size === soalList.length, `Paket ${index}: id soal duplikat`);

  return { ...bab, soal: soalList };
}

function docSoal(soal, nomor) {
  const label = {
    pg_singkat: 'Pilihan Ganda',
    pgm: 'Pilihan Ganda Majemuk',
    pg_kompleks: 'Pilihan Ganda Kompleks',
    menjodohkan: 'Menjodohkan',
    benar_salah: 'Pernyataan Benar-Salah'
  }[soal.tipe] || soal.tipe;
  const out = [`### ${nomor}. ${label} (${soal.level})`, '', soal.pertanyaan, ''];
  if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm' || soal.tipe === 'pg_kompleks') {
    soal.opsi.forEach((opsi, i) => out.push(`${letter(i)}. ${opsi}`));
    if (soal.tipe === 'pg_kompleks') out.push('', '_Pilih lebih dari satu jawaban._');
  } else if (soal.tipe === 'menjodohkan') {
    out.push('| No | Kolom Kiri | Pilihan Kolom Kanan |', '|---|---|---|');
    soal.kiri.forEach((k, i) => out.push(`| ${i + 1} | ${k} | ${letter(i)}. ${soal.kanan[i]} |`));
  } else if (soal.tipe === 'benar_salah') {
    out.push('| No | Pernyataan | B | S |', '|---|---|---|---|');
    soal.pernyataan.forEach((p, i) => out.push(`| ${i + 1} | ${p} |  |  |`));
  }
  out.push('');
  return out.join('\n');
}

function docStimulus(stim, nomor) {
  const lines = [`**Stimulus ${nomor} — ${stim.judul}**`, ''];
  if (stim.youtube_id) lines.push(`Video: https://www.youtube.com/watch?v=${stim.youtube_id}`, '');
  if (stim.gambar) lines.push(`Gambar: ${stim.gambar}`, '');
  lines.push(plain(stim.isi), '');
  if (stim.sumber) lines.push(`_Sumber: ${stim.sumber}_`, '');
  return lines.join('\n');
}

function buildDoc(pakets) {
  const lines = [
    '# Paket Soal TKA Geografi Kelas X',
    '',
    '**Materi:** sejarah dan filsafat geografi, objek studi geografi, 10 konsep esensial, 4 prinsip, serta 10 pendekatan geografi.',
    '',
    '**Komposisi:** 120 soal HOTS — 24 pilihan ganda, 24 pilihan ganda majemuk, 24 pilihan ganda kompleks, 24 menjodohkan, dan 24 pernyataan benar-salah.',
    '',
    '**Petunjuk:** setiap paket berisi 30 soal dengan stimulus artikel, tabel, atau video. Pilihan jawaban berupa pernyataan lengkap. Kerjakan pada lembar jawaban, lalu cocokkan dengan kunci yang tersedia di akhir setiap paket.',
    '',
    '---',
    ''
  ];
  let nomorGlobal = 0;
  pakets.forEach((paket, pi) => {
    lines.push(`## Paket ${pi + 1}: ${paket.judul}`, '', paket.ringkasan, '', '---', '');
    const soalPerKlaster = 6;
    paket.soal.forEach((soal, si) => {
      if (si % soalPerKlaster === 0) {
        const stim = soal.stimulus;
        lines.push(docStimulus(stim, Math.floor(si / soalPerKlaster) + 1));
      }
      nomorGlobal += 1;
      lines.push(docSoal(soal, nomorGlobal));
    });
    lines.push(`## Kunci Jawaban Paket ${pi + 1}`, '', '| No | Tipe | Kunci |', '|---|---|---|');
    paket.soal.forEach((soal, si) => {
      const nomor = pi * 30 + si + 1;
      lines.push(`| ${nomor} | ${soal.tipe} | ${kunciTeks(soal)} |`);
    });
    lines.push('', `### Pembahasan Paket ${pi + 1}`, '');
    paket.soal.forEach((soal, si) => {
      const nomor = pi * 30 + si + 1;
      lines.push(`${nomor}. **Kunci ${kunciTeks(soal)}.** ${soal.pembahasan}`);
    });
    lines.push('', '---', '');
  });
  return lines.join('\n');
}

function main() {
  const pakets = [];
  FILES.forEach((file, index) => {
    const srcPath = path.join(SRC_DIR, `paket-${file.paket}.js`);
    if (!fs.existsSync(srcPath)) {
      errors.push(`Sumber tidak ditemukan: ${srcPath}`);
      return;
    }
    const def = require(srcPath);
    pakets.push({ ...buildPaket(def, file.paket), __nama: file.nama });
  });

  if (errors.length) {
    console.error(`Validasi gagal (${errors.length} masalah):`);
    errors.slice(0, 40).forEach(e => console.error(' -', e));
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  pakets.forEach(paket => {
    const { __nama, ...data } = paket;
    fs.writeFileSync(path.join(OUT_DIR, __nama), JSON.stringify([data], null, 2) + '\n', 'utf-8');
    console.log(`tulis ${path.relative(ROOT, path.join(OUT_DIR, __nama))} (${data.soal.length} soal)`);
  });

  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, buildDoc(pakets), 'utf-8');
  console.log(`tulis ${path.relative(ROOT, DOC_PATH)}`);
  console.log(`total ${pakets.reduce((n, p) => n + p.soal.length, 0)} soal`);
}

main();
