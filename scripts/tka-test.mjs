// Uji paket soal TKA Kelas X: struktur file kurikulum, komposisi tipe, kunci,
// dan kelengkapan stimulus. Jalankan: node scripts/tka-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data', 'kurikulum', 'kelas-x');
const doc = path.join(root, 'docs', 'TKA-Geografi-Kelas-X.md');
const FILES = [
  '09-tka-sejarah-geografi.json',
  '10-tka-objek-konsep-prinsip.json',
  '11-tka-pendekatan-geografi.json',
  '12-tka-fenomena-mutakhir.json'
];
const KOMPOSISI = { pg_singkat: 6, pgm: 6, pg_kompleks: 6, menjodohkan: 6, benar_salah: 6 };

let gagal = 0;
function check(nama, ok, detail = '') {
  if (!ok) gagal++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nama}${detail ? '  -- ' + detail : ''}`);
}

const babs = [];
FILES.forEach(file => {
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) return check(`${file} ada`, false);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  check(`${file} berisi satu bab`, Array.isArray(data) && data.length === 1);
  if (Array.isArray(data) && data[0]) babs.push(data[0]);
});

check('empat paket TKA termuat', babs.length === 4, `paket=${babs.length}`);

const urutan = babs.map(b => b.urutan);
check('urutan bab naik dan bersambung', urutan.join(',') === '9,10,11,12', urutan.join(','));

let totalSoal = 0;
const semuaId = new Set();
babs.forEach(bab => {
  check(`${bab.id} kelas X`, bab.kelas === 'X');
  check(`${bab.id} akses bebas`, bab.bebas_akses === true);
  check(`${bab.id} punya materi ringkas`, Array.isArray(bab.materi) && bab.materi.length >= 1);
  check(`${bab.id} punya glosarium`, Array.isArray(bab.glosarium) && bab.glosarium.length >= 4);
  check(`${bab.id} berisi 30 soal`, (bab.soal || []).length === 30, `soal=${(bab.soal || []).length}`);

  const hitung = {};
  (bab.soal || []).forEach(s => { hitung[s.tipe] = (hitung[s.tipe] || 0) + 1; });
  Object.entries(KOMPOSISI).forEach(([tipe, jumlah]) => {
    check(`${bab.id} ${tipe} = ${jumlah}`, hitung[tipe] === jumlah, `aktual=${hitung[tipe] || 0}`);
  });

  (bab.soal || []).forEach(s => {
    totalSoal++;
    check(`${s.id} id unik`, !semuaId.has(s.id));
    semuaId.add(s.id);
    check(`${s.id} punya stimulus`, !!(s.stimulus && s.stimulus.judul && s.stimulus.isi));
    check(`${s.id} punya pembahasan`, String(s.pembahasan || '').length >= 60);
    if (s.tipe === 'pg_singkat' || s.tipe === 'pgm') {
      check(`${s.id} lima opsi`, (s.opsi || []).length === 5);
      check(`${s.id} kunci tunggal valid`, Array.isArray(s.kunci) && s.kunci.length === 1 && s.kunci[0] >= 0 && s.kunci[0] < 5);
    }
    if (s.tipe === 'pg_kompleks') {
      check(`${s.id} lima opsi`, (s.opsi || []).length === 5);
      check(`${s.id} kunci majemuk unik`, Array.isArray(s.kunci) && s.kunci.length >= 2 && new Set(s.kunci).size === s.kunci.length);
    }
    if (s.tipe === 'benar_salah') {
      check(`${s.id} empat pernyataan`, (s.pernyataan || []).length === 4);
      check(`${s.id} kunci B/S`, Array.isArray(s.kunci) && s.kunci.length === 4 && s.kunci.every(k => k === 'B' || k === 'S'));
    }
    if (s.tipe === 'menjodohkan') {
      check(`${s.id} lima pasangan`, (s.kiri || []).length === 5 && (s.kanan || []).length === 5);
      check(`${s.id} kunci permutasi`, Array.isArray(s.kunci) && s.kunci.length === 5 && new Set(s.kunci).size === 5);
    }
  });

  const video = (bab.soal || []).filter(s => s.stimulus && s.stimulus.youtube_id);
  check(`${bab.id} memuat stimulus video`, video.length >= 1, `soal video=${video.length}`);
});

check('total 120 soal', totalSoal === 120, `total=${totalSoal}`);

const teks = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : '';
check('dokumen cetak ada', teks.length > 10000, `${teks.length} karakter`);
const jumlahSoalDoc = (teks.match(/^### \d+\./gm) || []).length;
check('dokumen memuat 120 soal', jumlahSoalDoc === 120, `terhitung=${jumlahSoalDoc}`);
const jumlahKunci = (teks.match(/^## Kunci Jawaban Paket \d/gm) || []).length;
check('dokumen memuat 4 tabel kunci', jumlahKunci === 4, `terhitung=${jumlahKunci}`);

console.log(`\n${gagal === 0 ? 'SEMUA UJI LULUS' : 'ADA UJI GAGAL'} (gagal=${gagal})`);
process.exit(gagal === 0 ? 0 : 1);
