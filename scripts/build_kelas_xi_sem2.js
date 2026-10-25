const fs = require('fs');
const path = require('path');

const KELAS_XI_DIR = path.join(__dirname, '..', 'data', 'kurikulum', 'kelas-xi');

// ===== 05-06.json (Semester 2) =====
const babs05_06 = [
  {
    id: "xi-05",
    kelas: "XI",
    urutan: 5,
    semester: 2,
    youtube_id: "rK1tE8zJ_4E",
    fase: "F",
    elemen: "Pemahaman Konsep Dinamika Kependudukan",
    judul: "Dinamika Kependudukan dan Bonus Demografi Indonesia 2045",
    ringkasan: "Membedah struktur demografi bangsa: sensus & registrasi, perhitungan angka fertilitas/mortalitas, piramida penduduk stasioner, peluang emas bonus demografi (dependency ratio < 50), pengentasan stunting, dan kualitas SDM Indonesia Emas 2045.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis kuantitas dan kualitas penduduk Indonesia, menghitung indikator demografi, menafsirkan piramida penduduk, serta merumuskan strategi optimalisasi bonus demografi menuju Indonesia Emas 2045.",
    tujuan: [
      "Menganalisis sumber data kependudukan (sensus de facto/de jure, survei SUPAS, registrasi adminduk Dukcapil).",
      "Menghitung indikator demografi: CBR, CDR, IMR, ASFR, dan rasio ketergantungan (dependency ratio).",
      "Menganalisis bentuk-bentuk piramida penduduk (ekspansif, stasioner, konstruktif) dan perubahannya di Indonesia.",
      "Mengevaluasi peluang dan ancaman jendela bonus demografi Indonesia menjelang tahun 2045.",
      "Merumuskan solusi geografis mengatasi kesenjangan kualitas SDM (stunting, pendidikan vokasi, ketenagakerjaan hijau)."
    ],
    materi: [
      {
        id: "xi05-t1",
        judul: "Topik 1: Bonus Demografi & Peluang Indonesia Emas 2045",
        youtube_id: "rK1tE8zJ_4E",
        kuis_topik: {
          pertanyaan: "Kondisi di mana rasio ketergantungan (dependency ratio) berada pada titik terendah (kurang dari 50), di mana jumlah penduduk usia produktif (15–64 tahun) jauh lebih banyak dibanding penduduk usia non-produktif disebut ...",
          opsi: [
            "Ledakan Penduduk (Baby Boom)",
            "Bonus Demografi (Demographic Dividend)",
            "Degradasi Kependudukan",
            "Transisi Epidemiologi Negatif"
          ],
          kunci: 1,
          pembahasan: "Bonus demografi adalah fenomena demografis ketika proporsi penduduk usia kerja produktif (15–64 tahun) mencapai lebih dari 65–70% populasi, menghasilkan rasio ketergantungan < 50 per 100 orang pekerja. Ini menjadi modal utama lonjakan ekonomi nasional jika dibarengi kualitas pendidikan dan kesehatan prima."
        },
        html: `<div class="bl-callout case">
<h4>👥 Analisis Demografi Aktual 2026: Memanfaatkan Jendela Peluang Emas 2045</h4>
<p>Indonesia saat ini sedang berada di puncak fase <strong>Bonus Demografi</strong>, yang diproyeksikan akan berakhir sekitar tahun 2035–2040 sebelum memasuki era penuaan populasi (<em>aging population</em>). Dengan lebih dari 70% penduduk berada pada usia produktif (15–64 tahun), Indonesia memiliki peluang emas menjadi kekuatan ekonomi 5 besar dunia pada tahun 2045.</p>
<p>Namun, bonus demografi dapat menjadi <em>bencana demografi</em> jika generasi muda tidak memiliki keterampilan kerja yang relevan (skills mismatch), tingginya pengangguran terbuka, dan ancaman stunting pada balita. Oleh karena itu, pemerataan akses pendidikan teknologi, vokasi industri, dan fasilitas kesehatan menjadi prioritas keruangan mutlak.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Dinamika Kependudukan dan Bonus Demografi Indonesia 2045
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/rK1tE8zJ_4E?rel=0" title="Video Pembelajaran: Dinamika Kependudukan" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari indikator demografi, rasio beban ketergantungan, piramida penduduk, dan strategi Indonesia Emas.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Bonus Demografi", arti: "Kondisi struktur penduduk di mana proporsi usia produktif jauh lebih besar daripada non-produktif." },
      { istilah: "Rasio Ketergantungan", arti: "Perbandingan jumlah penduduk usia belum/tidak produktif terhadap penduduk usia produktif." },
      { istilah: "Piramida Penduduk", arti: "Grafik batang horizontal yang menyajikan struktur komposisi umur dan jenis kelamin penduduk." },
      { istilah: "Stunting", arti: "Gangguan pertumbuhan anak balita akibat kekurangan gizi kronis dan infeksi berulang." }
    ],
    soal: [
      {
        id: "xi-05-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menghitung rasio ketergantungan (dependency ratio)",
        numerasi: "Perhitungan matematis demografi",
        stimulus: {
          jenis: "tabel",
          judul: "Komposisi Penduduk Berdasarkan Kelompok Usia Kabupaten X",
          isi: "<table><thead><tr><th>Kelompok Usia</th><th>Jumlah Jiwa</th><th>Kategori</th></tr></thead><tbody><tr><td>0–14 tahun</td><td>30.000</td><td>Belum Produktif</td></tr><tr><td>15–64 tahun</td><td>100.000</td><td>Usia Produktif</td></tr><tr><td>65+ tahun</td><td>10.000</td><td>Tidak Produktif Lanjut Usia</td></tr></tbody></table>",
          sumber: "BPS Kabupaten X"
        },
        pertanyaan: "Berapa rasio beban ketergantungan (dependency ratio) Kabupaten X dan bagaimana interpretasi ekonominya?",
        opsi: [
          "40 per 100, artinya setiap 100 penduduk produktif hanya menanggung 40 penduduk non-produktif (kondisi bonus demografi tercapai)",
          "50 per 100, artinya beban ketergantungan seimbang",
          "70 per 100, artinya beban ketergantungan sangat berat",
          "25 per 100, artinya daerah mengalami kekurangan tenaga kerja"
        ],
        kunci: [0],
        pembahasan: "Rasio Ketergantungan = [(Penduduk 0-14 + Penduduk 65+) / Penduduk 15-64] × 100 = [(30.000 + 10.000) / 100.000] × 100 = (40.000 / 100.000) × 100 = 40. Karena DR < 50, wilayah ini telah menikmati fase bonus demografi yang menguntungkan perekonomian."
      }
    ]
  },
  {
    id: "xi-06",
    kelas: "XI",
    urutan: 6,
    semester: 2,
    youtube_id: "2vK8s_aX49c",
    fase: "F",
    elemen: "Pemahaman Konsep Keragaman Budaya dan Ekonomi Kreatif",
    judul: "Keragaman Budaya Bangsa dan Ekonomi Kreatif Spasial",
    ringkasan: "Menggali kekayaan peradaban Nusantara: 7 unsur kebudayaan dalam ruang, kearifan lokal konservasi (Subak Bali, Lubuk Larangan Minang), arsitektur vernakular rumah adat, serta potensi ekonomi kreatif berbasis Geopark UNESCO 2026.",
    estimasi: "6 JP",
    cp: "Peserta didik mampu menganalisis faktor pembentuk keragaman budaya Indonesia, mengevaluasi peran kearifan lokal dalam pelestarian lingkungan hidup, serta merancang model pengembangan ekonomi kreatif berbasis keunikan geografis wilayah.",
    tujuan: [
      "Menganalisis faktor geografis yang membentuk keragaman suku, bahasa, dan adat istiadat di Indonesia.",
      "Menguraikan kearifan lokal konservasi alam: Subak di Bali, Hutan Larangan Kenegerian Rumbio, Lubuk Larangan Sumatra.",
      "Menjelaskan adaptasi arsitektur rumah adat vernakular terhadap iklim tropis lembap dan bencana alam.",
      "Mengevaluasi pemanfaatan warisan budaya dan keindahan lanskap bumi dalam jaringan UNESCO Global Geoparks (UGGp).",
      "Merumuskan strategi promosi ekonomi kreatif kerajinan dan pariwisata budaya berbasis kearifan lokal."
    ],
    materi: [
      {
        id: "xi06-t1",
        judul: "Topik 1: Kearifan Lokal Konservasi & Geopark UNESCO 2026",
        youtube_id: "2vK8s_aX49c",
        kuis_topik: {
          pertanyaan: "Sistem irigasi pertanian tradisional Subak di Bali yang diakui sebagai Warisan Budaya Dunia oleh UNESCO tidak hanya mengatur pembagian debit air secara adil, tetapi juga menerapkan filosofi keruangan hidup harmonis yang dikenal sebagai ...",
          opsi: [
            "Tri Hita Karana (Harmoni manusia dengan Tuhan, alam lingkungan, dan sesama manusia)",
            "Fisis Determinisme Mutlak",
            "Revolusi Hijau Kimiawi",
            "Eksploitasi Lahan Monokultur"
          ],
          kunci: 0,
          pembahasan: "Subak dijiwai oleh filosofi Tri Hita Karana yang menekankan keseimbangan antara hubungan manusia dengan Tuhan (pura subak), hubungan antarsesama petani dalam pembagian air egaliter, dan hubungan harmonis dengan alam lingkungan ekosistem sawah bertingkat."
        },
        html: `<div class="bl-callout case">
<h4>🏛️ Budaya dan Ruang 2026: UNESCO Global Geopark Indonesia Menggerakkan Ekonomi Kreatif</h4>
<p>Indonesia kini memiliki 10 jaringan <strong>UNESCO Global Geoparks (UGGp)</strong>, antara lain Geopark Batur (Bali), Gunung Sewu (DIY-Jateng-Jatim), Ciletuh-Palabuhanratu (Jawa Barat), Rinjani-Lombok (NTB), Belitong (Babel), Danau Toba (Sumut), hingga Raja Ampat dan Meratus.</p>
<p>Konsep Geopark memadukan tiga pilar secara terpadu: <em>Geo-heritage</em> (warisan kebumian langka), <em>Bio-heritage</em> (keanekaragaman hayati flora-fauna), dan <em>Cultural-heritage</em> (kekayaan budaya dan kearifan lokal masyarakat). Geopark membuktikan bahwa melestarikan alam dan budaya justru menjadi motor penggerak ekonomi kreatif pariwisata ramah lingkungan yang mensejahterakan warga lokal.</p>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Kearifan Lokal", arti: "Tata nilai, norma, dan pengetahuan tradisional yang diwariskan turun-temurun untuk mengelola lingkungan secara lestari." },
      { istilah: "Subak", arti: "Organisasi kemasyarakatan tradisional di Bali yang mengatur tata kelola sistem irigasi persawahan secara religius dan demokratis." },
      { istilah: "Geopark", arti: "Wilayah terpadu yang mempromosikan perlindungan warisan geologi, keanekaragaman hayati, dan budaya lokal secara berkelanjutan." }
    ],
    soal: [
      {
        id: "xi-06-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis kearifan lokal Lubuk Larangan dalam konservasi sungai",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Tradisi Lubuk Larangan di Sumatra",
          isi: "<p>Masyarakat adat menetapkan zona sungai sepanjang 1 km sebagai 'Lubuk Larangan', di mana siapa pun dilarang keras memancing atau menjala ikan selama satu tahun penuh. Pelanggar dikenai sanksi adat dan denda semen. Ikan baru boleh dipanen bersama-sama dalam satu hari festival 'buka lubuk' dan hasilnya disumbangkan untuk pembangunan desa.</p>",
          sumber: "Kearifan Lokal Pengelolaan Perairan Darat"
        },
        pertanyaan: "Dampak ekologis dan sosial paling penting dari penerapan kearifan lokal Lubuk Larangan tersebut adalah ...",
        opsi: [
          "Memberikan waktu bagi populasi ikan sungai untuk berkembang biak secara alami hingga dewasa, mencegah kepunahan ikan endemik, dan memperkuat kohesi sosial gotong royong warga",
          "Menyebabkan air sungai menjadi beracun",
          "Membuat warga desa kehilangan protein hewani selamanya",
          "Menghalangi perlintasan kapal dagang internasional"
        ],
        kunci: [0],
        pembahasan: "Lubuk Larangan merupakan model konservasi perikanan darat berbasis kearifan lokal (community-based conservation) yang menjamin regenerasi siklus hidup ikan sungai serta memupuk modal sosial dan ekonomi kas desa secara berkelanjutan."
      }
    ]
  }
];

fs.writeFileSync(path.join(KELAS_XI_DIR, '05-06.json'), JSON.stringify(babs05_06, null, 2), 'utf-8');
console.log('Successfully updated kelas-xi/05-06.json (Semester 2)!');

// ===== 07-08.json (Semester 2) =====
const babs07_08 = [
  {
    id: "xi-07",
    kelas: "XI",
    urutan: 7,
    semester: 2,
    youtube_id: "wH4pL9bZ-2s",
    fase: "F",
    elemen: "Pemahaman Konsep Lingkungan Hidup dan Pembangunan Berkelanjutan",
    judul: "Pelestarian Lingkungan Hidup, AMDAL, dan Jejak Ekologis",
    ringkasan: "Menjaga batas daya dukung bumi: daya dukung dan daya tampung lingkungan (D3TLH), jejak karbon & ekologis, valuasi ekonomi jasa ekosistem mangrove/hutan hujan, audit lingkungan hidup, dan implementasi SDGs 2030 di Indonesia.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis daya dukung dan daya tampung lingkungan hidup, menghitung jejak ekologis dan jejak karbon, mengevaluasi dokumen AMDAL dalam pembangunan, serta merancang aksi nyata pembangunan berkelanjutan (SDGs).",
    tujuan: [
      "Menjelaskan konsep daya dukung dan daya tampung lingkungan hidup (D3TLH) menurut UU No. 32 Tahun 2009.",
      "Menganalisis instrumen dokumen AMDAL (KA-ANDAL, ANDAL, RKL, RPL) dalam memitigasi risiko lingkungan proyek strategis.",
      "Menghitung jejak ekologis (ecological footprint) dan jejak karbon individu maupun kawasan permukiman.",
      "Menilai jasa ekosistem (ekosistem penyedia, pengatur iklim, budaya, dan pendukung) melalui valuasi ekonomi lingkungan.",
      "Merumuskan strategi implementasi 17 Tujuan Pembangunan Berkelanjutan (Sustainable Development Goals / SDGs) di daerah."
    ],
    materi: [
      {
        id: "xi07-t1",
        judul: "Topik 1: Daya Dukung Lingkungan, AMDAL & Jejak Ekologis 2026",
        youtube_id: "wH4pL9bZ-2s",
        kuis_topik: {
          pertanyaan: "Kondisi ketika kebutuhan sumber daya alam dan konsumsi energi suatu populasi melebihi kapasitas biokapasitas bumi untuk memperbarui diri dan menyerap limbah buangan disebut ...",
          opsi: [
            "Ecological Overshoot (Defisit Ekologis)",
            "Keseimbangan Klimaks Ekosistem",
            "Swasembada Sumber Daya",
            "Revitalisasi Lingkungan Hidup"
          ],
          kunci: 0,
          pembahasan: "Ecological overshoot terjadi ketika jejak ekologis (ecological footprint) manusia melampaui biokapasitas alami bumi (Earth Overshoot). Ini menyebabkan degradasi lahan, penumpukan karbon di atmosfer, dan krisis kepunahan spesies."
        },
        html: `<div class="bl-callout case">
<h4>🌿 Isu Keberlanjutan 2026: Valuasi Karbon Biru (Blue Carbon) Hutan Mangrove Indonesia</h4>
<p>Indonesia memiliki hutan mangrove seluas lebih dari 3,3 juta hektare (sekitar 20–23% total mangrove dunia). Dalam era perdagangan karbon global (<em>carbon trading</em>), ekosistem mangrove diakui sebagai penyimpan <strong>Karbon Biru (Blue Carbon)</strong> terbaik yang mampu menyerap dan mengunci emisi karbon 4 hingga 10 kali lebih banyak per hektare dibanding hutan hujan tropis daratan.</p>
<p>Melalui program restorasi gambut dan rehabilitasi mangrove Badan Restorasi Gambut dan Mangrove (BRGM), Indonesia memadukan penyelamatan pesisir dari abrasi dengan perolehan devisa kredit karbon internasional berstandar tinggi.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Pelestarian Lingkungan Hidup, AMDAL, dan SDGs 2030
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/wH4pL9bZ-2s?rel=0" title="Video Pembelajaran: Lingkungan Hidup & AMDAL" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari daya dukung lingkungan, dokumen AMDAL, jejak karbon, dan pembangunan berkelanjutan.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Daya Dukung Lingkungan", arti: "Kemampuan lingkungan hidup untuk mendukung perikehidupan manusia dan makhluk hidup lain." },
      { istilah: "Jejak Karbon", arti: "Jumlah total gas rumah kaca yang dihasilkan secara langsung maupun tidak langsung oleh aktivitas manusia." },
      { istilah: "Blue Carbon", arti: "Karbon yang diserap dan disimpan oleh ekosistem laut dan pesisir (mangrove, padang lamun, rawa payau)." },
      { istilah: "SDGs", arti: "17 tujuan global yang disepakati PBB untuk mengakhiri kemiskinan, mengurangi kesenjangan, dan melindungi bumi." }
    ],
    soal: [
      {
        id: "xi-07-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis dokumen Rencana Pengelolaan Lingkungan (RKL) pada proyek jalan tol",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Dokumen AMDAL Pembangunan Jalan Tol Lintas Hutan",
          isi: "<p>Dalam dokumen RKL-RPL proyek jalan tol, konsultan AMDAL mewajibkan pelaksana proyek menanam pohon berakar dalam pada lereng galian, membangun kolam pengendap sedimen di dekat sungai, dan membatasi jam kerja alat berat di malam hari di dekat kawasan suaka burung langka.</p>",
          sumber: "Komisi Penilai AMDAL Kementerian LHK"
        },
        pertanyaan: "Pernyataan manakah yang paling tepat mencerminkan fungsi dokumen RKL di atas?",
        opsi: [
          "RKL berfungsi sebagai panduan operasional wajib bagi pemrakarsa proyek untuk memitigasi dan mengendalikan dampak negatif penting lingkungan yang telah diprediksi dalam dokumen ANDAL",
          "RKL hanya merupakan formalitas izin tanpa perlu dilaksanakan di lapangan",
          "RKL bertujuan untuk menghentikan proyek pembangunan secara permanen",
          "RKL dibuat untuk menaikkan harga tarif tiket jalan tol"
        ],
        kunci: [0],
        pembahasan: "RKL (Rencana Pengelolaan Lingkungan Hidup) adalah dokumen legal operasional yang memuat upaya-upaya penanganan dampak penting lingkungan yang ditimbulkan oleh rencana usaha atau kegiatan pembangunan."
      }
    ]
  },
  {
    id: "xi-08",
    kelas: "XI",
    urutan: 8,
    semester: 2,
    youtube_id: "mUvS48n9v3U",
    fase: "F",
    elemen: "Pemahaman Konsep Kesiapsiagaan dan Resiliensi Komunitas",
    judul: "Mitigasi Bencana Berbasis Komunitas dan Adaptasi Iklim",
    ringkasan: "Mengokohkan ketahanan masyarakat: konsep Desa Tangguh Bencana (Destana), pemetaan partisipatif risiko bencana, adaptasi perubahan iklim di wilayah pesisir & pegunungan, serta rancangan proyek penelitian geografi lingkungan sekolah.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis ketahanan dan resiliensi masyarakat dalam menghadapi bencana alam dan perubahan iklim, melakukan pemetaan partisipatif, serta merancang proyek aksi mitigasi bencana berbasis komunitas.",
    tujuan: [
      "Menganalisis indikator Desa Tangguh Bencana (Destana) BNPB: regulasi, kelembagaan, sistem peringatan dini, dan logistik evakuasi.",
      "Melaksanakan teknik pemetaan partisipatif (participatory mapping) untuk menyusun peta jalur evakuasi sekolah dan lingkungan tempat tinggal.",
      "Membedakan strategi adaptasi perubahan iklim di wilayah pesisir (tanggul alami, rumah panggung terapung) dan wilayah pegunungan (embung air dan agroforestri).",
      "Merancang proposal proyek penelitian geografi lingkungan kontekstual dengan alur berpikir ilmiah.",
      "Mempresentasikan hasil proyek mitigasi bencana dan adaptasi lingkungan dalam berbagai format karya."
    ],
    materi: [
      {
        id: "xi08-t1",
        judul: "Topik 1: Desa Tangguh Bencana & Pemetaan Partisipatif 2026",
        youtube_id: "mUvS48n9v3U",
        kuis_topik: {
          pertanyaan: "Keunggulan utama pemetaan partisipatif (participatory mapping) risiko bencana oleh warga komunitas lokal dibanding peta yang dibuat oleh orang luar adalah ...",
          opsi: [
            "Warga lokal memiliki memori historis yang detail mengenai batas genangan banjir terparah, jalur jalan tikus evakuasi tercepat, dan keberadaan kelompok rentan (lansia dan balita)",
            "Peta partisipatif tidak membutuhkan kertas maupun gambar",
            "Peta partisipatif otomatis menghapus risiko gempa bumi",
            "Peta partisipatif dapat dijual dengan harga mahal ke wisatawan asing"
          ],
          kunci: 0,
          pembahasan: "Pemetaan partisipatif memanfaatkan kearifan lokal dan memori kolektif warga setempat (local knowledge). Warga paling paham lokasi warga difabel/lansia yang butuh bantuan evakuasi, titik kumpul aman, serta rintangan fisik di lapangan yang tidak selalu terlihat di citra satelit."
        },
        html: `<div class="bl-callout case">
<h4>🏘️ Resiliensi Komunitas 2026: Membangun Budaya Sadar Bencana di Seluruh Pelosok</h4>
<p>Ketika bencana gempa bumi atau tsunami melanda, rentang waktu emas (<em>golden time</em>) penyelamatan nyawa adalah 0 hingga 15 menit pertama. Penelitian membuktikan bahwa 95% korban selamat karena <strong>kemampuan evakuasi mandiri (self-rescue)</strong> dan bantuan dari keluarga serta tetangga terdekat, bukan menunggu tim penyelamat dari kota yang sering terhambat reruntuhan jalan.</p>
<p>Melalui program <strong>Desa Tangguh Bencana (Destana)</strong> dan Satuan Pendidikan Aman Bencana (SPAB) di sekolah-sekolah, peserta didik dilatih membaca peta ancaman geospasial, memimpin simulasi jalur evakuasi, dan menumbuhkan kepedulian sosial keruangan.</p>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Resiliensi Bencana", arti: "Kemampuan suatu sistem, komunitas, atau masyarakat yang terpapar bahaya untuk bertahan, menyerap, beradaptasi, dan pulih secara cepat." },
      { istilah: "Destana", arti: "Desa Tangguh Bencana, program pembinaan ketahanan bencana di tingkat desa/kelurahan oleh BNPB." },
      { istilah: "Pemetaan Partisipatif", arti: "Metode pemetaan di mana data spasial dan informasi lingkungan dikumpulkan dan digambar langsung oleh warga komunitas." }
    ],
    soal: [
      {
        id: "xi-08-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menilai efektivitas sistem peringatan dini berbasis komunitas",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Sistem Peringatan Dini Longsor di Dusun Terpencil",
          isi: "<p>Warga memasang sensor kabel pergerakan tanah sederhana yang dihubungkan ke lonceng kentongan bambu di pos ronda. Ketika terjadi pergeseran tanah lereng sedalam 5 cm, kawat terputus dan sirine/kentongan berbunyi kencang.</p>",
          sumber: "Inovasi Mitigasi Mandiri Komunitas"
        },
        pertanyaan: "Mengapa teknologi tepat guna berbasis kearifan lokal ini sering kali lebih efektif di daerah terpencil dibanding sirine otomatis berbasis internet?",
        opsi: [
          "Karena tidak bergantung pada sinyal internet/listrik PLN yang sering padam saat badai, mudah dirawat mandiri oleh warga, dan bunyi kentongan langsung dikenali warga sebagai komando evakuasi",
          "Karena kentongan bambu dapat menahan runtuhnya tanah bukit",
          "Karena sensor kabel dapat mengubah tanah labil menjadi batuan granit",
          "Karena harga bambu jauh lebih mahal dari satelit"
        ],
        kunci: [0],
        pembahasan: "Sistem peringatan dini komunitas (community-based early warning system) yang sederhana dan mandiri memiliki keandalan tinggi di daerah pedesaan terpencil karena tahan terhadap putusnya jaringan listrik/telekomunikasi seluler saat cuaca ekstrem."
      }
    ]
  }
];

fs.writeFileSync(path.join(KELAS_XI_DIR, '07-08.json'), JSON.stringify(babs07_08, null, 2), 'utf-8');
console.log('Successfully updated kelas-xi/07-08.json (Semester 2)!');
