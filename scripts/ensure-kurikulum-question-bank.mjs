import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const levels = ['x', 'xi', 'xii'];
const questionTypes = ['pg_singkat', 'pgm', 'pg_kompleks', 'menjodohkan', 'benar_salah'];

function plainText(value) {
  return String(value || '')
    .replace(/<(script|style|svg|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readingFor(bab) {
  const sections = (bab.materi || []).map((materi) => {
    const body = plainText(materi.html);
    return [materi.judul, body].filter(Boolean).join('. ');
  });
  const text = [
    bab.ringkasan,
    bab.cp,
    ...sections,
    ...(bab.tujuan || [])
  ].filter(Boolean).join(' ');
  const excerpt = text.length > 2400 ? text.slice(0, text.lastIndexOf(' ', 2400)) : text;
  const paragraphs = [
    `${bab.judul}. ${bab.ringkasan}`,
    excerpt,
    `Capaian pembelajaran: ${bab.cp}`,
    `Tujuan pembelajaran: ${(bab.tujuan || []).join(' ')}`
  ].filter(Boolean);
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
}

function fifthChoice(tipe) {
  if (tipe === 'pgm') {
    return 'Pernyataan (1), (2), (3), dan (4) benar tanpa perlu membandingkannya dengan bukti pada bacaan.';
  }
  if (tipe === 'pg_kompleks') {
    return 'Memilih seluruh opsi tanpa menilai kecocokannya dengan bukti dan konteks dalam bacaan.';
  }
  return 'Mengambil satu istilah dari bacaan sebagai kesimpulan tanpa memeriksa kaitannya dengan topik yang dibahas.';
}

function generatedQuestion(bab, tipe, id, stimulus) {
  const goals = bab.tujuan || [];
  const g1 = goals[0] || bab.ringkasan;
  const g2 = goals[1] || g1;
  const g3 = goals[2] || g2;
  const topic = (bab.materi || [])[0]?.judul || bab.judul;
  const context = bab.ringkasan || bab.judul;
  const common = {
    id,
    tipe,
    level: 'C4',
    literasi: `Menganalisis bacaan kontekstual tentang ${bab.judul}`,
    numerasi: 'Tidak dominan',
    stimulus: {
      jenis: 'teks',
      judul: `Bacaan kontekstual: ${topic}`,
      isi: stimulus,
      gambar: '',
      sumber: 'Materi pembelajaran kurikulum'
    }
  };

  if (tipe === 'pg_singkat') {
    return {
      ...common,
      pertanyaan: `Berdasarkan bacaan dan bukti yang disajikan, simpulan manakah yang paling tepat untuk menjelaskan fokus pembelajaran “${topic}”?`,
      opsi: [
        `Menggunakan informasi dalam bacaan untuk menganalisis ${g1} serta menghubungkannya dengan konteks geografis yang sedang dibahas.`,
        `Mengabaikan bukti kontekstual dan menyimpulkan bahwa ${g1} tidak perlu dipertimbangkan dalam analisis wilayah.`,
        `Membatasi pembahasan pada hafalan istilah, tanpa menilai hubungan antara ${context} dan tujuan pembelajaran.`,
        `Menganggap satu contoh pada bacaan sudah cukup untuk menyatakan semua wilayah memiliki kondisi dan persoalan yang sama.`
      ],
      kunci: [0],
      pembahasan: `Jawaban A paling tepat karena mengaitkan bukti dalam bacaan dengan capaian “${g1}”. Pilihan lain mengabaikan bukti, membatasi analisis pada hafalan, atau menggeneralisasi satu kasus tanpa mempertimbangkan variasi ruang.`
    };
  }

  if (tipe === 'pgm') {
    return {
      ...common,
      pertanyaan: `Bacaan memuat empat pernyataan berikut. (1) Bukti dalam bacaan dapat digunakan untuk menjelaskan “${g1}”. (2) Analisis dapat mengaitkan konteks bacaan dengan “${g2}”. (3) Kesimpulan harus mengabaikan konteks wilayah. (4) Satu kasus cukup untuk mewakili semua wilayah. Pilih kombinasi pernyataan yang benar.`,
      opsi: [
        `Pernyataan (1) dan (2) saja benar karena keduanya menghubungkan bukti bacaan dengan tujuan belajar yang relevan.`,
        `Pernyataan (1) dan (3) saja benar karena konteks wilayah boleh diabaikan setelah satu bukti ditemukan.`,
        `Pernyataan (2) dan (4) saja benar karena satu kasus selalu mewakili karakteristik seluruh wilayah.`,
        `Semua pernyataan benar karena kesimpulan tidak perlu diuji dengan konteks maupun bukti bacaan.`
      ],
      kunci: [0],
      pembahasan: `Hanya kombinasi (1) dan (2) yang tepat: tujuan “${g1}” dan “${g2}” didukung oleh bacaan. Pernyataan (3) dan (4) keliru karena analisis geografis harus mempertimbangkan konteks dan tidak menggeneralisasi satu kasus.`
    };
  }

  if (tipe === 'pg_kompleks') {
    return {
      ...common,
      pertanyaan: `Untuk menyusun analisis yang utuh atas kasus “${topic}”, pilih semua langkah yang sesuai dengan bacaan.`,
      opsi: [
        `Mengidentifikasi bukti dan kondisi wilayah yang disebutkan, lalu mengaitkannya dengan capaian “${g1}”.`,
        `Membandingkan temuan dengan capaian “${g2}” dan menjelaskan keterkaitan antarunsur berdasarkan stimulus.`,
        `Menetapkan kesimpulan sebelum membaca data dan mempertahankannya meskipun bertentangan dengan stimulus.`,
        `Menghapus konteks tempat dan waktu karena keduanya tidak pernah memengaruhi gejala geografis.`
      ],
      kunci: [0, 1],
      pembahasan: `Langkah A dan B memakai bukti, konteks, serta tujuan pembelajaran untuk membangun analisis. Langkah C dan D tidak tepat karena mengabaikan data serta sifat keruangan fenomena.`
    };
  }

  if (tipe === 'benar_salah') {
    return {
      ...common,
      pertanyaan: 'Tentukan apakah setiap pernyataan berikut benar atau salah berdasarkan bacaan.',
      pernyataan: [
        `Bacaan dapat digunakan untuk mengkaji capaian pembelajaran “${g1}”.`,
        `Bacaan menyatakan bahwa konteks wilayah tidak penting dan seluruh tempat harus dianggap sama.`,
        `Salah satu arah pembelajaran yang relevan ialah “${g2}”.`,
        `Kesimpulan yang baik boleh mengabaikan bukti bacaan meskipun bertentangan dengan tujuan “${g3}”.`
      ],
      kunci: ['B', 'S', 'B', 'S'],
      pembahasan: `Pernyataan pertama dan ketiga benar karena sesuai tujuan pembelajaran. Pernyataan kedua dan keempat salah: analisis geografis harus mempertimbangkan konteks serta mendukung kesimpulan dengan bukti.`
    };
  }

  const kiri = [
    'Arah analisis untuk tujuan pembelajaran pertama',
    'Arah analisis untuk tujuan pembelajaran kedua',
    'Cakupan utama bab yang dipelajari',
    'Topik pembuka pada bacaan'
  ];
  const kanan = [
    `Menggunakan bukti untuk membahas: ${g1}`,
    `Mengkaji konteks materi: ${topic}`,
    `Menghubungkan temuan dengan: ${g2}`,
    `Memahami ruang lingkup: ${context}`
  ];
  return {
    ...common,
    tipe: 'menjodohkan',
    pertanyaan: 'Pasangkan setiap arah kajian di kolom kiri dengan uraian yang paling sesuai di kolom kanan.',
    kiri,
    kanan,
    kunci: [0, 2, 3, 1],
    pembahasan: `Pasangan ditentukan dari kesesuaian tujuan dan ruang lingkup: tujuan pertama adalah “${g1}”, tujuan kedua “${g2}”, cakupan bab “${context}”, dan bacaan pembuka “${topic}”.`
  };
}

let updatedFiles = 0;
let updatedChapters = 0;

for (const level of levels) {
  const dir = path.join(root, 'data', 'kurikulum', `kelas-${level}`);
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const fullPath = path.join(dir, file);
    const babs = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    let changed = false;

    for (const bab of babs) {
      let babChanged = false;
      const stimulusText = readingFor(bab);
      const existing = bab.soal || [];
      const existingTypes = new Set(existing.map((soal) => soal.tipe));

      for (const soal of existing) {
        if (['pg_singkat', 'pgm', 'pg_kompleks'].includes(soal.tipe) && soal.opsi?.length === 4) {
          soal.opsi.push(fifthChoice(soal.tipe));
          changed = true;
          babChanged = true;
        }
        if (['pg_singkat', 'pgm', 'pg_kompleks'].includes(soal.tipe) && soal.opsi?.length !== 5) {
          throw new Error(`${bab.id}/${soal.id} harus memiliki tepat lima opsi A-E`);
        }
        if (soal.tipe === 'pgm' && soal.kunci?.length > 1
          && String(soal.literasi || '').startsWith('Menganalisis bacaan kontekstual tentang')) {
          Object.assign(soal, generatedQuestion(bab, 'pgm', soal.id, stimulusText));
          changed = true;
          babChanged = true;
        }
        if (plainText(soal.stimulus?.isi).length < 800) {
          soal.stimulus = {
            ...(soal.stimulus || {}),
            jenis: soal.stimulus?.jenis || 'teks',
            judul: soal.stimulus?.judul || `Bacaan kontekstual: ${(bab.materi || [])[0]?.judul || bab.judul}`,
            isi: stimulusText,
            sumber: soal.stimulus?.sumber || 'Materi pembelajaran kurikulum'
          };
          changed = true;
          babChanged = true;
        }
      }

      for (const tipe of questionTypes) {
        if (existingTypes.has(tipe)) continue;
        if (existing.length >= 10) throw new Error(`${bab.id} melebihi 10 soal`);
        existing.push(generatedQuestion(bab, tipe, `${bab.id}-q${existing.length + 1}`, stimulusText));
        existingTypes.add(tipe);
        changed = true;
        babChanged = true;
      }

      if (existing.length < 5 || existing.length > 10) {
        throw new Error(`${bab.id} harus memiliki 5–10 soal; ditemukan ${existing.length}`);
      }
      bab.soal = existing;
      if (babChanged) updatedChapters++;
    }

    if (changed) {
      fs.writeFileSync(fullPath, `${JSON.stringify(babs, null, 2)}\n`);
      updatedFiles++;
    }
  }
}

console.log(`Updated ${updatedChapters} chapters across ${updatedFiles} files; all chapters have 5–10 questions.`);
