const fs = require('fs');
const path = require('path');

const KELAS_XII_DIR = path.join(__dirname, '..', 'data', 'kurikulum', 'kelas-xii');
if (!fs.existsSync(KELAS_XII_DIR)) {
  fs.mkdirSync(KELAS_XII_DIR, { recursive: true });
}

// ===== 01-03.json (Semester 1) =====
const babs01_03 = [
  {
    id: "xii-01",
    kelas: "XII",
    urutan: 1,
    semester: 1,
    youtube_id: "tK2pW8yZ_1o",
    fase: "F",
    elemen: "Pemahaman Konsep Tata Ruang dan Pengembangan Wilayah",
    judul: "Pengembangan Wilayah, Tata Ruang, dan Kebijakan Nasional",
    ringkasan: "Mengkonstruksi ruang masa depan: konsep wilayah formal & fungsional, hierarki tata ruang (RTRWN, RTRWP, RTRWK, RDTR), teori kutub pertumbuhan François Perroux, teori tempat sentral Christaller, serta dinamika perencanaan spasial IKN Nusantara 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis konsep wilayah dan perwilayahan, teori-teori pertumbuhan keruangan, struktur hierarki rencana tata ruang wilayah di Indonesia, serta mengevaluasi pembangunan Ibu Kota Nusantara (IKN).",
    tujuan: [
      "Membedakan konsep wilayah formal (homogen) dan wilayah fungsional (nodal/heterogen) beserta perwilayahannya.",
      "Menganalisis teori pertumbuhan wilayah: Teori Tempat Sentral (Christaller), Teori Kutub Pertumbuhan (Perroux), dan Teori Polarisasi Spasial (Myrdal).",
      "Menelaah hierarki rencana tata ruang di Indonesia: RTRW Nasional, Provinsi, Kabupaten/Kota, dan Rencana Detail Tata Ruang (RDTR) berbasis OSS digital.",
      "Mengevaluasi kebijakan relokasi ibu kota negara ke IKN Nusantara dari perspektif pemerataan ekonomi Indonesia-sentris.",
      "Mengidentifikasi konflik pemanfaatan ruang dan merumuskan solusi pengendalian tata ruang berbasis zonasi."
    ],
    materi: [
      {
        id: "xii01-t1",
        judul: "Topik 1: Konsep Wilayah, Teori Pusat Pertumbuhan & IKN 2026",
        youtube_id: "tK2pW8yZ_1o",
        kuis_topik: {
          pertanyaan: "Teori Kutub Pertumbuhan (Growth Poles Theory) dari François Perroux menyatakan bahwa pembangunan tidak terjadi di sembarang tempat secara serentak, melainkan muncul di titik-titik kutub tertentu dengan intensitas berbeda. Dampak penjalaran positif dari kutub pertumbuhan ke wilayah hinterland sekitarnya disebut ...",
          opsi: [
            "Backwash Effect (Efek Polarisasi Menghisap)",
            "Spread Effect / Trickle-Down Effect (Efek Penjalaran Menyebar)",
            "Slum Area Effect",
            "Centrifugal Barrier"
          ],
          kunci: 1,
          pembahasan: "Menurut François Perroux dan Gunnar Myrdal, kutub pertumbuhan memicu dua efek: Spread Effect / Trickle Down Effect (dampak positif penjalaran kemajuan dan permintaan bahan baku ke wilayah hinterland) dan Backwash Effect (dampak negatif tersedotnya tenaga kerja terampil dan modal dari desa ke pusat pertumbuhan)."
        },
        html: `<div class="bl-callout case">
<h4>🏙️ Geostrategi Wilayah 2026: Mengubah Paradigma Jawa-Sentris Menjadi Indonesia-Sentris</h4>
<p>Selama puluhan tahun, struktur keruangan ekonomi Indonesia mengalami ketimpangan spasial yang sangat tajam: <strong>Pulau Jawa yang luasnya hanya ±7% dari total wilayah Indonesia menyumbang sekitar 57% Produk Domestik Bruto (PDB) nasional</strong> dan dihuni lebih dari 56% penduduk.</p>
<p>Pemindahan pusat pemerintahan ke <strong>IKN Nusantara di Kalimantan Timur</strong> dirancang sebagai pembentukan <em>Superhub Ekonomi Baru</em> di tengah kepulauan Nusantara. IKN bersama mitra kota Balikpapan dan Samarinda berperan sebagai kutub pertumbuhan pemicu penjalaran ekonomi (spread effect) ke seluruh Kawasan Timur Indonesia (KTI).</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Tata Ruang Wilayah, Teori Keruangan, dan Pembangunan IKN Nusantara
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/tK2pW8yZ_1o?rel=0" title="Video Pembelajaran: Tata Ruang Wilayah" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari konsep RTRW, hierarki tempat sentral Christaller, kutub pertumbuhan Perroux, dan perencanaan IKN.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Wilayah Formal", arti: "Wilayah yang dicirikan oleh keseragaman atau homogenitas kriteria fisik atau sosial tertentu (misal kawasan karst, suku Badui)." },
      { istilah: "Wilayah Fungsional", arti: "Wilayah yang dicirikan oleh adanya interelasi dan interaksi heterogen antara titik pusat (node) dengan kawasan sekitarnya (misal Jabodetabek)." },
      { istilah: "Kutub Pertumbuhan", arti: "Pusat konsentrasi kegiatan ekonomi yang mampu menyebarkan pengaruh pembangunan ke wilayah sekitarnya." },
      { istilah: "RTRW", arti: "Rencana Tata Ruang Wilayah, pedoman pembangunan keruangan jangka panjang (20 tahun) di Indonesia." }
    ],
    soal: [
      {
        id: "xii-01-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis dampak polarisasi spasial Backwash Effect Myrdal",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Ketimpangan Ekonomi Kota Metropolitan dan Desa Hinterland",
          isi: "<p>Pesatnya pertumbuhan industri di Kota Metropolitan menarik ribuan pemuda lulusan terbaik dari desa-desa sekitar, disertai modal tabungan masyarakat desa yang dialihkan ke bank-bank di ibu kota. Akibatnya, desa tertinggal dan kekurangan tenaga produktif.</p>",
          sumber: "Kajian Ekonomi Spasial Bappenas"
        },
        pertanyaan: "Fenomena tersedotnya sumber daya manusia dan modal dari kawasan penyangga ke pusat kota ini dalam teori Gunnar Myrdal disebut ...",
        opsi: [
          "Backwash Effect",
          "Spread Effect",
          "Trickle-Down Effect",
          "Homogenitas Wilayah"
        ],
        kunci: [0],
        pembahasan: "Backwash effect adalah kekuatan polarisasi yang merugikan wilayah tertinggal/desa di mana faktor-faktor produksi (tenaga kerja muda potensial dan modal finansial) mengalir tersedot ke pusat pertumbuhan metropolitan yang lebih menguntungkan."
      }
    ]
  },
  {
    id: "xii-02",
    kelas: "XII",
    urutan: 2,
    semester: 1,
    youtube_id: "eM9xJ4pL-5A",
    fase: "F",
    elemen: "Pemahaman Konsep Interaksi Spasial Desa dan Kota",
    judul: "Pola Keruangan dan Interaksi Spasial Desa-Kota",
    ringkasan: "Memahami hubungan fungsional desa-kota: struktur ruang desa, morfologi konsentris & sektoral kota, hukum gravitasi keruangan W.J. Reilly, teori titik henti Carrothers, fenomena konurbasi Megapolitan Jabodetabekpunjur, dan penataan kawasan kumuh (slum area) 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis struktur keruangan desa dan kota, menghitung kekuatan interaksi spasial menggunakan model gravitasi dan titik henti, serta mengevaluasi dampak positif dan negatif interaksi desa-kota.",
    tujuan: [
      "Menganalisis pola keruangan permukiman desa (memanjang jalan/pantai, terpusat, tersebar) berdasarkan kondisi fisis.",
      "Membandingkan teori struktur ruang kota: Teori Konsentris (Burgess), Teori Sektoral (Hoyt), dan Teori Inti Berganda (Harris-Ullman).",
      "Menghitung kekuatan interaksi wilayah menggunakan Hukum Gravitasi W.J. Reilly.",
      "Menentukan lokasi fasilitas pelayanan optimal (rumah sakit, pasar regional) menggunakan Teori Titik Henti (Breaking Point Theory).",
      "Mengevaluasi dampak urban sprawl, gentrifikasi, dan strategi peremajaan kawasan kumuh perkotaan 2026."
    ],
    materi: [
      {
        id: "xii02-t1",
        judul: "Topik 1: Model Gravitasi Reilly, Titik Henti & Interaksi Desa-Kota 2026",
        youtube_id: "eM9xJ4pL-5A",
        kuis_topik: {
          pertanyaan: "Jumlah penduduk Kota A adalah 20.000 jiwa dan Kota B adalah 5.000 jiwa. Jarak antara kedua kota adalah 30 km. Menurut rumus Titik Henti Carrothers D_AB = Jarak / (1 + sqrt(P_A / P_B)), di manakah lokasi ideal pembangunan fasilitas rumah sakit bersama?",
          opsi: [
            "10 km dari Kota B (kota yang penduduknya lebih sedikit)",
            "10 km dari Kota A (kota yang penduduknya lebih banyak)",
            "15 km tepat di tengah-tengah kedua kota",
            "30 km di luar kedua kota"
          ],
          kunci: 0,
          pembahasan: "D_AB = 30 / (1 + sqrt(20.000 / 5.000)) = 30 / (1 + sqrt(4)) = 30 / (1 + 2) = 30 / 3 = 10 km. Jarak titik henti selalu diukur dari kota dengan populasi lebih kecil (Kota B), sehingga lokasi ideal adalah 10 km dari Kota B."
        },
        html: `<div class="bl-callout case">
<h4>🏙️ Dinamika Megapolitan 2026: Konurbasi Jabodetabekpunjur dan Aglomerasi Bodetabek</h4>
<p>Kawasan Megapolitan <strong>Jabodetabekpunjur</strong> (Jakarta, Bogor, Depok, Tangerang, Bekasi, Puncak, Cianjur) dengan populasi lebih dari 35 juta jiwa menjadi salah satu kawasan aglomerasi perkotaan terbesar di dunia. Setiap hari, jutaan komuter melakukan mobilitas ulang-alik (commuter mobility) melintasi batas administratif wilayah.</p>
<p>Kajian interaksi keruangan membuktikan bahwa persoalan kemacetan lalu lintas, banjir kiriman DAS Ciliwung, dan penyediaan perumahan terjangkau tidak dapat diselesaikan oleh Jakarta sendirian. Dibutuhkan perencanaan <em>Transit-Oriented Development (TOD)</em> terintegrasi berbasis MRT, LRT, dan KRL Commuter Line lintas wilayah.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Interaksi Spasial Desa dan Kota serta Teori Struktur Keruangan
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/eM9xJ4pL-5A?rel=0" title="Video Pembelajaran: Interaksi Desa-Kota" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari teori gravitasi keruangan Reilly, rumus titik henti, dan struktur morfologi kota.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Interaksi Spasial", arti: "Hubungan timbal balik yang saling memengaruhi antara dua wilayah atau lebih yang menghasilkan fenomena baru." },
      { istilah: "Hukum Gravitasi Reilly", arti: "Model matematis yang menyatakan kekuatan interaksi dua wilayah berbanding lurus dengan perkalian populasi dan berbanding terbalik dengan kuadrat jarak." },
      { istilah: "Titik Henti", arti: "Jarak batas matematis dari wilayah berpopulasi lebih kecil untuk penempatan lokasi pelayanan strategis." },
      { istilah: "Urban Sprawl", arti: "Pemekaran fisik kenampakan perkotaan ke arah wilayah pinggiran pedesaan secara acak dan tidak terencana." }
    ],
    soal: [
      {
        id: "xii-02-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menghitung kekuatan interaksi gravitasi wilayah",
        numerasi: "Perhitungan matematis kuadrat jarak",
        stimulus: {
          jenis: "tabel",
          judul: "Data Tiga Kota yang Saling Berinteraksi",
          isi: "<p>Penduduk Kota A = 10.000 jiwa; Kota B = 20.000 jiwa; Kota C = 30.000 jiwa. Jarak A-B = 20 km; Jarak B-C = 10 km.</p>",
          sumber: "Kajian Transportasi Spasial"
        },
        pertanyaan: "Berdasarkan Hukum Gravitasi I_AB = (P_A × P_B) / (d_AB)^2, bandingkan kekuatan interaksi antara pasangan Kota A-B dan Kota B-C!",
        opsi: [
          "Interaksi B-C (6.000.000) jauh lebih kuat dibanding A-B (500.000) karena jaraknya lebih dekat dan populasinya lebih besar",
          "Interaksi A-B lebih kuat daripada B-C",
          "Kedua pasangan kota memiliki interaksi yang identik sama",
          "Tidak dapat dihitung karena tidak ada data jalan tol"
        ],
        kunci: [0],
        pembahasan: "I_AB = (10.000 × 20.000) / 20^2 = 200.000.000 / 400 = 500.000. I_BC = (20.000 × 30.000) / 10^2 = 600.000.000 / 100 = 6.000.000. Kekuatan interaksi B-C adalah 12 kali lebih besar dibanding A-B."
      }
    ]
  },
  {
    id: "xii-03",
    kelas: "XII",
    urutan: 3,
    semester: 1,
    youtube_id: "uK36ngUq-1I",
    fase: "F",
    elemen: "Penerapan Geoteknologi dan Transportasi Cerdas",
    judul: "Penginderaan Jauh dan SIG untuk Tata Ruang & Transportasi",
    ringkasan: "Implementasi teknologi geospasial mutakhir: pemanfaatan citra resolusi sangat tinggi dan LiDAR untuk Rencana Detail Tata Ruang (RDTR), pemodelan rute transportasi cerdas Kereta Cepat Whoosh & MRT, serta integrasi Smart City perkotaan 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menerapkan data penginderaan jauh dan analisis SIG untuk perencanaan tata ruang wilayah, manajemen jaringan transportasi cerdas, serta pengembangan kota pintar (Smart City).",
    tujuan: [
      "Menganalisis peran citra satelit resolusi sangat tinggi (CSRT) dalam penyusunan Rencana Detail Tata Ruang (RDTR) skala 1:5.000.",
      "Menggunakan data Digital Elevation Model (DEM) dan LiDAR untuk perencanaan lereng trase rel kereta cepat dan jalan tol.",
      "Menerapkan Network Analysis SIG untuk penentuan rute logistik tercepat dan penetapan lokasi halte feeder transportasi umum.",
      "Mengevaluasi konsep Transit-Oriented Development (TOD) berbasis analisis jangkauan jalan kaki (pedestrian catchment area).",
      "Merancang konsep Smart City berbasis integrasi dashboard geospasial IoT di era digital 2026."
    ],
    materi: [
      {
        id: "xii03-t1",
        judul: "Topik 1: Citra Resolusi Tinggi, SIG Rute Transportasi & Smart City 2026",
        youtube_id: "uK36ngUq-1I",
        kuis_topik: {
          pertanyaan: "Konsep Transit-Oriented Development (TOD) yang diterapkan pada stasiun Kereta Cepat Whoosh Halim dan Tegalluar bertujuan untuk ...",
          opsi: [
            "Memaksa semua orang membeli mobil pribadi baru",
            "Mengintegrasikan stasiun transportasi massal cepat dengan kawasan hunian padat, area perkantoran, dan fasilitas komersial dalam radius jalan kaki 400–800 meter untuk mengurangi kemacetan dan emisi karbon",
            "Membangun lapangan golf di dalam stasiun kereta",
            "Menghapus seluruh jaringan bus angkutan umum"
          ],
          kunci: 1,
          pembahasan: "TOD adalah pola tata ruang ramah lingkungan yang memusatkan permukiman, perkantoran, dan perdagangan di sekitar simpul transportasi massal (stasiun), sehingga masyarakat dapat bepergian cukup dengan berjalan kaki atau bersepeda tanpa perlu mengemudikan kendaraan bermotor pribadi."
        },
        html: `<div class="bl-callout case">
<h4>🚅 Geoteknologi Transportasi 2026: Analisis Spasial Jaringan Kereta Cepat Whoosh</h4>
<p>Dalam pengoperasian <strong>Kereta Cepat Jakarta-Bandung (Whoosh)</strong> dengan kelajuan 350 km/jam, analisis geospasial SIG berperan penting tidak hanya pada tahap konstruksi terowongan, tetapi juga pada tahap integrasi multimoda di stasiun (Halim, Karawang, Padalarang, dan Tegalluar).</p>
<p>Melalui analisis <em>Pedestrian Service Area</em> SIG (buffer radius 500 meter dan 1.000 meter), perencana kota merancang integrasi halte feeder bus Transjakarta, stasiun LRT Jabodebek, dan KA Feeder Bandung. Penumpang dari pusat Kota Jakarta dapat mencapai pusat Kota Bandung dalam waktu kurang dari 1 jam secara mulus tanpa bergantung pada mobil pribadi di jalan tol yang macet.</p>
</div>`
      }
    ],
    glosarium: [
      { istilah: "CSRT", arti: "Citra Satelit Resolusi Sangat Tinggi (< 1 meter) yang wajib digunakan untuk penyusunan peta RDTR skala 1:5.000." },
      { istilah: "TOD", arti: "Transit-Oriented Development, kawasan berorientasi transit yang memaksimalkan akses transportasi publik." },
      { istilah: "Smart City", arti: "Kota cerdas yang mengintegrasikan teknologi informasi dan data geospasial untuk meningkatkan efisiensi layanan kota." }
    ],
    soal: [
      {
        id: "xii-03-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis radius pelayanan pedestrian walkability TOD stasiun",
        numerasi: "Perhitungan radius buffer",
        stimulus: {
          jenis: "teks",
          judul: "Analisis Jangkauan Pejalan Kaki Stasiun LRT/Kereta Cepat",
          isi: "<p>Kajian standar TOD menetapkan bahwa batas kenyamanan jalan kaki warga menuju stasiun adalah 5 menit (radius 400 meter) dan maksimal 10 menit (radius 800 meter). Di luar radius 800 meter, masyarakat membutuhkan feeder angkutan lingkungan sepeda atau mikrotrans.</p>",
          sumber: "Pedoman Pengembangan Kawasan Berorientasi Transit Kementerian ATR/BPN"
        },
        pertanyaan: "Analisis SIG apa yang paling tepat dijalankan untuk mengevaluasi apakah perumahan warga terlayani akses jalan kaki menuju stasiun?",
        opsi: [
          "Network Service Area Analysis sepanjang jaringan trotoar pejalan kaki dengan cut-off 400 meter dan 800 meter dari pintu masuk stasiun",
          "Analisis indeks vegetasi NDVI",
          "Analisis gempa tektonik",
          "Pengukuran salinitas air laut"
        ],
        kunci: [0],
        pembahasan: "Network service area analysis adalah analisis jaringan berbasis topologi jalan/trotoar yang mengukur jarak tempuh nyata (bukan garis lurus udara), sehingga dapat memetakan persil perumahan mana saja yang benar-benar berada dalam jangkauan jalan kaki 400–800 meter ke stasiun."
      }
    ]
  }
];

fs.writeFileSync(path.join(KELAS_XII_DIR, '01-03.json'), JSON.stringify(babs01_03, null, 2), 'utf-8');
console.log('Successfully created kelas-xii/01-03.json (Semester 1)!');

// ===== 04-06.json (Semester 2) =====
const babs04_06 = [
  {
    id: "xii-04",
    kelas: "XII",
    urutan: 4,
    semester: 2,
    youtube_id: "aN7wK2mP_9Y",
    fase: "F",
    elemen: "Pemahaman Konsep Negara Maju dan Negara Berkembang",
    judul: "Karakteristik Wilayah Negara Maju dan Negara Berkembang",
    ringkasan: "Membedah ketimpangan pembangunan global: indikator kuantitatif dan kualitatif kemajuan negara (HDI, GDP per kapita, angka harapan hidup), dikotomi Global North vs Global South, tahapan pertumbuhan ekonomi Rostow, serta strategi Indonesia keluar dari Middle Income Trap 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis karakteristik wilayah negara maju dan berkembang, mengevaluasi tahapan pembangunan Rostow, memetakan ketimpangan Global North dan South, serta merumuskan strategi transformasi Indonesia menjadi negara maju berpendapatan tinggi.",
    tujuan: [
      "Menganalisis indikator penentu kemajuan negara: ekonomi (pendapatan per kapita, struktur lapangan kerja) dan non-ekonomi (Human Development Index / HDI, angka melek huruf, angka kematian bayi).",
      "Membandingkan karakteristik spasial dan demografi negara maju (Piramida konstruktif, urbanisasi tinggi, emisi industri) dan negara berkembang (Piramida ekspansif, sektor agraris dominan).",
      "Menelaah Teori Tahapan Pertumbuhan Ekonomi W.W. Rostow (masyarakat tradisional hingga era konsumsi massal tinggi).",
      "Menganalisis fenomena Jebakan Pendapatan Menengah (Middle Income Trap) yang dihadapi Indonesia dan negara-negara berkembang.",
      "Mengevaluasi peran inovasi sains, digitalisasi, dan hilirisasi dalam mendorong Indonesia keluar dari status negara berkembang menuju Indonesia Maju."
    ],
    materi: [
      {
        id: "xii04-t1",
        judul: "Topik 1: Indikator Pembangunan, HDI & Jebakan Pendapatan Menengah 2026",
        youtube_id: "aN7wK2mP_9Y",
        kuis_topik: {
          pertanyaan: "Human Development Index (HDI) yang dirilis UNDP mengukur keberhasilan pembangunan manusia suatu negara tidak hanya dari pendapatan ekonomi riil, melainkan dari tiga dimensi dasar yaitu ...",
          opsi: [
            "Kesehatan (umur panjang dan sehat), Pendidikan (lama sekolah), dan Standar Hidup Layak (pengeluaran per kapita)",
            "Jumlah pesawat tempur, luas wilayah laut, dan panjang jalan tol",
            "Banyaknya tambang emas dan gedung bertingkat",
            "Kecepatan jaringan internet dan jumlah pengguna media sosial"
          ],
          kunci: 0,
          pembahasan: "Indeks Pembangunan Manusia (IPM / HDI) dibangun dari 3 pilar esensial peradaban: (1) Umur panjang dan hidup sehat yang diukur dari Angka Harapan Hidup saat lahir, (2) Pengetahuan yang diukur dari Harapan Lama Sekolah dan Rata-rata Lama Sekolah, serta (3) Standar hidup layak yang diukur dari Pendapatan Nasional Bruto (GNI) per kapita disesuaikan paritas daya beli (PPP)."
        },
        html: `<div class="bl-callout case">
<h4>🌏 Analisis Global 2026: Strategi Indonesia Lepas dari Jebakan Pendapatan Menengah</h4>
<p>Banyak negara di dunia terjebak dalam <strong>Middle Income Trap</strong>: berhasil keluar dari status negara miskin berkat upah buruh murah dan ekspor komoditas mentah, namun gagal bertransformasi menjadi negara maju berpenghasilan tinggi karena produktivitas stagnan dan riset teknologi rendah.</p>
<p>Untuk melompat menjadi negara maju pada peringatan satu abad kemerdekaan (Indonesia Emas 2045), Indonesia menggenjot 3 pilar spasial: hilirisasi SDA nikel dan bauksit di luar Jawa, pemerataan infrastruktur logistik antarpulau, dan peningkatan belanja riset sains inovasi teknologi digital.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Karakteristik Negara Maju dan Negara Berkembang di Dunia
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/aN7wK2mP_9Y?rel=0" title="Video Pembelajaran: Negara Maju vs Berkembang" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari indikator IPM (HDI), Global North vs South, teori Rostow, dan transformasi ekonomi.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "HDI / IPM", arti: "Indeks komposit yang mengukur pencapaian rata-rata suatu negara dalam kesehatan, pendidikan, dan standar hidup." },
      { istilah: "Global North-South", arti: "Pembagian sosio-ekonomi dan politik dunia antara negara-negara maju (mayoritas di belahan bumi utara) dan berkembang." },
      { istilah: "Middle Income Trap", arti: "Keadaan ketika suatu negara mencapai tingkat pendapatan menengah namun terhambat untuk naik menjadi negara maju." }
    ],
    soal: [
      {
        id: "xii-04-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis pergeseran struktur ketenagakerjaan dari agraris ke industri jasa",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "tabel",
          judul: "Struktur Tenaga Kerja Berdasarkan Sektor Ekonomi di Dua Negara",
          isi: "<table><thead><tr><th>Negara</th><th>Sektor Primer (Pertanian/Tambang)</th><th>Sektor Sekunder (Manufaktur)</th><th>Sektor Tersier (Jasa, Riset, Finansial)</th></tr></thead><tbody><tr><td>Negara X</td><td>3%</td><td>22%</td><td>75%</td></tr><tr><td>Negara Y</td><td>48%</td><td>18%</td><td>34%</td></tr></tbody></table>",
          sumber: "Organisasi Buruh Internasional (ILO)"
        },
        pertanyaan: "Berdasarkan data struktur ketenagakerjaan di atas, kesimpulan geografis yang paling valid adalah ...",
        opsi: [
          "Negara X adalah negara maju dengan perekonomian berbasis teknologi tinggi dan jasa bernilai tambah, sedangkan Negara Y adalah negara berkembang yang masih bergantung pada sektor agraris",
          "Negara Y lebih maju karena memproduksi lebih banyak padi",
          "Kedua negara berada pada tahap masyarakat tradisional",
          "Negara X terancam kelaparan karena kekurangan petani"
        ],
        kunci: [0],
        pembahasan: "Ciri khas negara maju (Negara X) adalah dominasi sektor tersier (jasa, inovasi, keuangan > 70%) dan modernisasi sektor primer melalui mekanisasi otomatis sehingga hanya butuh sedikit tenaga kerja namun sangat efisien. Sebaliknya, negara berkembang (Negara Y) masih menyerap hampir separuh tenaga kerjanya di sektor pertanian manual berupah rendah."
      }
    ]
  },
  {
    id: "xii-05",
    kelas: "XII",
    urutan: 5,
    semester: 2,
    youtube_id: "qL5pJ8xM_3E",
    fase: "F",
    elemen: "Pemahaman Geopolitik dan Kerja Sama Antarwilayah",
    judul: "Kerja Sama Keruangan Antarwilayah dan Geopolitik Global",
    ringkasan: "Menavigasi dinamika dunia: teori kerja sama keruangan internasional, rantai pasok global (global supply chain), integrasi ekonomi kawasan (ASEAN, RCEP, G20, BRICS), diplomasi perbatasan antarnegara, dan posisi tawar mineral kritis Indonesia 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis pola dan bentuk kerja sama keruangan antarwilayah dan antarnegara, menganalisis posisi geopolitik Indonesia dalam organisasi internasional, serta mengevaluasi peran Indonesia dalam rantai pasok global komoditas strategis.",
    tujuan: [
      "Menganalisis faktor pendorong kerja sama keruangan antarnegara: komplementaritas regional, transferabilitas spasial, dan hilangnya penghalang intervensi.",
      "Menguraikan bentuk-bentuk kerja sama bilateral, regional (ASEAN Economic Community), dan multilateral (RCEP, G20, WTO, BRICS).",
      "Mengevaluasi posisi strategis Indonesia dalam penguasaan rantai pasok global mineral kritis (nikel dan tembaga) untuk industri kendaraan listrik dunia.",
      "Menganalisis dinamika geopolitik perbatasan darat dan laut Indonesia dengan 10 negara tetangga.",
      "Merumuskan strategi diplomasi geospasial Indonesia dalam menjaga perdamaian dan keadilan iklim global."
    ],
    materi: [
      {
        id: "xii05-t1",
        judul: "Topik 1: Rantai Pasok Global, RCEP, G20 & Geopolitik 2026",
        youtube_id: "qL5pJ8xM_3E",
        kuis_topik: {
          pertanyaan: "Persetujuan Kemitraan Ekonomi Komprehensif Regional (Regional Comprehensive Economic Partnership / RCEP) yang melibatkan 10 negara ASEAN ditambah 5 mitra (Tiongkok, Jepang, Korea Selatan, Australia, Selandia Baru) merupakan blok perdagangan bebas terbesar di dunia karena ...",
          opsi: [
            "Hanya memperdagangkan satu jenis komoditas gandum",
            "Mencakup hampir 30% dari total populasi dunia dan sekitar 30% dari Produk Domestik Bruto (PDB) global, menciptakan kawasan perdagangan bebas terpadu tanpa tarif yang luas",
            "Mewajibkan semua negara anggota menggunakan mata uang yang sama",
            "Menghapus seluruh batas kedaulatan negara anggota"
          ],
          kunci: 1,
          pembahasan: "RCEP adalah blok perdagangan bebas raksasa yang mencakup 2,3 miliar penduduk dunia dan sepertiga perekonomian global. Keikutsertaan Indonesia memperluas akses pasar ekspor manufaktur, produk kelautan, dan komoditas olahan nikel tanpa hambatan tarif tinggi."
        },
        html: `<div class="bl-callout case">
<h4>🌐 Diplomasi Strategis 2026: Menguatnya Posisi Tawar Mineral Kritis Indonesia</h4>
<p>Dalam transisi energi hijau global dari bahan bakar fosil menuju kendaraan listrik dan energi terbarukan, dunia sangat bergantung pada <em>Critical Raw Materials (CRM)</em> seperti nikel, litium, kobalt, tembaga, dan bauksit.</p>
<p>Sebagai produsen nikel nomor satu di dunia, posisi geopolitik Indonesia di forum internasional (G20, ASEAN, dan kemitraan bilateral) meningkat pesat. Indonesia mempraktikkan <strong>Diplomasi Non-Blok Aktif</strong>: bermitra secara seimbang dengan negara-negara Barat, Asia Timur, dan negara-negara Selatan Global (Global South) demi kepentingan nasional dan kedaulatan ekonomi rakyat.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Kerja Sama Keruangan Global dan Geopolitik Dunia
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/qL5pJ8xM_3E?rel=0" title="Video Pembelajaran: Geopolitik Global" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari teori interaksi spasial Ullman, blok perdagangan RCEP, dan diplomasi batas negara.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Geopolitik", arti: "Kebijakan politik suatu negara yang dipengaruhi oleh letak geografis, bentang alam, dan sumber daya alam wilayahnya." },
      { istilah: "Rantai Pasok Global", arti: "Jaringan internasional terpadu yang memproduksi dan mendistribusikan barang dari bahan mentah hingga ke konsumen akhir." },
      { istilah: "Mineral Kritis", arti: "Mineral yang memiliki peran sangat vital bagi industri strategis dan pertahanan namun rentan terhadap gangguan pasokan." },
      { istilah: "RCEP", arti: "Persetujuan Kemitraan Ekonomi Komprehensif Regional antara negara ASEAN dan lima negara mitra dagang utama." }
    ],
    soal: [
      {
        id: "xii-05-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis teori komplementaritas regional Edward Ullman",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Perdagangan Antarwilayah: Indonesia dan Jepang",
          isi: "<p>Indonesia kaya akan bijih nikel dan bauksit olahan namun membutuhkan teknologi presisi tinggi dan mesin industri otomotif. Jepang memiliki keunggulan riset manufaktur canggih namun sama sekali tidak memiliki cadangan tambang nikel alami.</p>",
          sumber: "Analisis Perdagangan Internasional Kementerian Perdagangan"
        },
        pertanyaan: "Berdasarkan teori interaksi spasial Edward Ullman, faktor pendorong utama terjadinya arus perdagangan intensif antara Indonesia dan Jepang adalah ...",
        opsi: [
          "Regional Complementarity (Komplementaritas Regional / Saling Melengkapi Kebutuhan)",
          "Intervening Opportunity (Kesempatan Intervensi Pihak Ketiga)",
          "Spatial Transferability Barrier",
          "Homogenitas Geologis"
        ],
        kunci: [0],
        pembahasan: "Regional complementarity (komplementaritas regional) timbul ketika ada perbedaan ketersediaan sumber daya alam dan kebutuhan antardaerah: Wilayah A memiliki surplus barang yang dibutuhkan Wilayah B, dan sebaliknya, sehingga tercipta hubungan saling melengkapi."
      }
    ]
  },
  {
    id: "xii-06",
    kelas: "XII",
    urutan: 6,
    semester: 2,
    youtube_id: "wH4pL9bZ-2s",
    fase: "F",
    elemen: "Pemahaman Isu Keruangan Global dan Masa Depan Bumi",
    judul: "Isu Keruangan Global, SDGs 2030, dan Ketahanan Bumi",
    ringkasan: "Menjaga masa depan peradaban: krisis iklim Antroposen, kenaikan permukaan air laut global, migrasi pengungsi iklim (climate refugees), pencapaian 17 target SDGs 2030, keadilan iklim antargenerasi, dan peran generasi muda dalam aksi bumi 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis isu-isu keruangan global terkini (krisis iklim, ketahanan pangan global, krisis air tawar), mengevaluasi pencapaian Sustainable Development Goals (SDGs 2030), serta merancang aksi nyata penyelamatan lingkungan bumi.",
    tujuan: [
      "Menganalisis fenomena krisis lingkungan global di era Antroposen (pemanasan global, kepunahan massal spesies ke-6, polusi mikroplastik samudra).",
      "Mengevaluasi dampak kenaikan muka air laut terhadap kelangsungan negara-negara kepulauan kecil (Small Island Developing States / SIDS) dan kota pesisir dunia.",
      "Menelaah fenomena pengungsi iklim (climate refugees) dan implikasi geopolitiknya.",
      "Mengevaluasi capaian dan tantangan implementasi 17 indikator SDGs 2030 di tingkat nasional dan global.",
      "Merumuskan komitmen dan aksi nyata gaya hidup berkelanjutan ramah lingkungan sebagai warga bumi yang bertanggung jawab."
    ],
    materi: [
      {
        id: "xii06-t1",
        judul: "Topik 1: Krisis Antroposen, Kenaikan Muka Laut & SDGs 2030",
        youtube_id: "wH4pL9bZ-2s",
        kuis_topik: {
          pertanyaan: "Era geologis baru di mana aktivitas manusia telah menjadi kekuatan pendorong paling dominan dalam mengubah iklim, atmosfer, biosfer, dan lanskap permukaan bumi secara global dikenal sebagai era ...",
          opsi: [
            "Antroposen (Anthropocene)",
            "Pleistosen",
            "Kambrium",
            "Mesozoikum"
          ],
          kunci: 0,
          pembahasan: "Antroposen adalah istilah ilmiah untuk mendeskripsikan kurun waktu geologis bumi masa kini, di mana jejak aktivitas manusia (pembakaran bahan bakar fosil, deforestasi masif, plastik, uji nuklir) telah mengubah susunan kimiawi atmosfer dan sistem bumi melebihi kekuatan alamiah."
        },
        html: `<div class="bl-callout case">
<h4>🌍 Agenda Bumi 2026: Menuju Tenggat SDGs 2030 dan Keadilan Antargenerasi</h4>
<p>Dunia hanya memiliki sisa waktu kurang dari 5 tahun menjelang batas waktu pencapaian <strong>Sustainable Development Goals (SDGs 2030)</strong>. Dari 17 tujuan pembangunan berkelanjutan—mulai dari Tanpa Kemiskinan (SDG 1), Penanganan Perubahan Iklim (SDG 13), hingga Ekosistem Daratan (SDG 15)—banyak target yang memerlukan akselerasi radikal.</p>
<p>Bagi generasi muda Indonesia yang akan memegang tampuk kepemimpinan pada <em>Indonesia Emas 2045</em>, literasi geografi bukan sekadar menghafal nama gunung atau teluk. Literasi geografi adalah <strong>kompas etika keruangan</strong> untuk memastikan bahwa setiap gedung yang dibangun, setiap tambang yang digali, dan setiap kebijakan yang diambil tidak mengorbankan hak anak-cucu kita untuk menghirup udara bersih dan hidup damai di planet bumi yang lestari.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Isu Keruangan Global, Agenda SDGs 2030, dan Masa Depan Planet Bumi
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/wH4pL9bZ-2s?rel=0" title="Video Pembelajaran: Isu Keruangan Global & SDGs" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari krisis iklim global, keadilan iklim antargenerasi, dan aksi nyata pencapaian SDGs 2030.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Antroposen", arti: "Zaman geologis modern di mana aktivitas manusia menjadi pemicu utama perubahan iklim dan ekosistem global." },
      { istilah: "Climate Refugees", arti: "Orang atau kelompok yang terpaksa meninggalkan tempat tinggal asalnya akibat dampak perubahan iklim ekstrem." },
      { istilah: "Keadilan Iklim", arti: "Konsep yang memandang krisis iklim sebagai masalah etika, hak asasi manusia, dan keadilan sosial antargenerasi." },
      { istilah: "Biokapasitas", arti: "Kapasitas ekosistem bumi untuk menghasilkan sumber daya hayati yang berguna dan menyerap limbah buangan manusia." }
    ],
    soal: [
      {
        id: "xii-06-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis prinsip keadilan iklim antargenerasi",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Gugatan Hukum Iklim Kaum Muda Internasional",
          isi: "<p>Kelompok generasi muda di berbagai negara mengajukan gugatan perdata lingkungan ke pengadilan terhadap pemerintah mereka karena lambatnya dekarbonisasi energi. Mereka menuntut hak konstitusional atas lingkungan hidup yang bersih dan sehat untuk generasi masa depan.</p>",
          sumber: "Laporan Keadilan Iklim PBB"
        },
        pertanyaan: "Konsep etika keruangan apa yang menjadi fondasi gugatan hukum iklim tersebut?",
        opsi: [
          "Intergenerational Climate Justice (Keadilan Iklim Antargenerasi), bahwa generasi saat ini berkewajiban moral menjaga kelayakan huni bumi bagi generasi mendatang",
          "Eksploitasi sumber daya alam tanpa batas",
          "Penyerahan seluruh tanggung jawab iklim kepada alam",
          "Pembangunan industri tanpa izin lingkungan"
        ],
        kunci: [0],
        pembahasan: "Keadilan iklim antargenerasi (intergenerational justice) menegaskan bahwa generasi saat ini bertindak sebagai wali bumi (steward of the earth) yang tidak berhak menghabiskan sumber daya dan mewariskan kehancuran ekologis kepada generasi penerus."
      }
    ]
  }
];

fs.writeFileSync(path.join(KELAS_XII_DIR, '04-06.json'), JSON.stringify(babs04_06, null, 2), 'utf-8');
console.log('Successfully created kelas-xii/04-06.json (Semester 2)!');
