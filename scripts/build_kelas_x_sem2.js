const fs = require('fs');
const path = require('path');

const KELAS_X_DIR = path.join(__dirname, '..', 'data', 'kurikulum', 'kelas-x');

// ===== 05-06.json (Semester 2) =====
const p05_06 = path.join(KELAS_X_DIR, '05-06.json');
const babs05_06 = [
  {
    id: "x-05",
    kelas: "X",
    urutan: 5,
    semester: 2,
    youtube_id: "ryrXAGY1VJr",
    fase: "E",
    elemen: "Pemahaman Konsep Litosfer dan Pedosfer",
    judul: "Dinamika Litosfer dan Dampaknya terhadap Kehidupan",
    ringkasan: "Membedah dinamika kulit bumi: struktur interior bumi, lempeng tektonik & zona megathrust Sunda, erupsi vulkanik (Gunung Ruang & Merapi), sesar aktif darat (Sesar Lembang), pelapukan, kerentanan mudstone IKN Nusantara, dan pembentukan tanah.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu memahami struktur litosfer, menganalisis proses tektonisme, vulkanisme, dan seisme serta pengaruhnya bagi kehidupan; menganalisis tenaga eksogen serta upaya konservasi tanah di Indonesia.",
    tujuan: [
      "Menganalisis lapisan struktur interior bumi dan pergerakan lempeng tektonik (konvergen, divergen, transform).",
      "Menguraikan mekanisme vulkanisme, intrusi vs ekstrusi magma, jenis erupsi, serta manfaat tanah andosol bagi pertanian.",
      "Menganalisis seisme, gelombang seismik (P, S, L), rumus Laska, dan mitigasi bahaya sesar aktif darat di Indonesia.",
      "Mengevaluasi proses eksogen (pelapukan, erosi, mass wasting, sedimentasi) serta studi kasus batuan mudstone di IKN Nusantara.",
      "Menjelaskan profil horizon tanah dan merumuskan metode konservasi tanah mekanik, vegetatif, dan kimiawi."
    ],
    materi: [
      {
        id: "x05-t1",
        judul: "Topik 1: Struktur Interior Bumi, Tektonik Lempeng & Megathrust",
        youtube_id: "ryrXAGY1VJr",
        kuis_topik: {
          pertanyaan: "Pertemuan lempeng Indo-Australia yang menunjam ke bawah lempeng Eurasia di barat Sumatra dan selatan Jawa membentuk zona subduksi aktif. Zona akumulasi energi gesekan antar-lempeng samudra dan benua ini dikenal sebagai ...",
          opsi: [
            "Zona Sesar Geser Transform",
            "Zona Megathrust (Tunjaman Raksasa)",
            "Pematang Tengah Samudra (Mid-Ocean Ridge)",
            "Lembah Retakan Graben"
          ],
          kunci: 1,
          pembahasan: "Zona megathrust adalah bidang kontak patahan naik raksasa di zona penunjaman (subduksi) lempeng konvergen, di mana lempeng samudra yang lebih padat menunjam ke bawah lempeng benua. Jika kuncian bidang ini patah tiba-tiba, dapat memicu gempa bermagnitudo > 8,5 dan tsunami destruktif."
        },
        html: `<div class="bl-callout case">
<h4>🌋 Geodinamika Nusantara 2026: Ancaman Megathrust Sunda dan Sesar Darat Aktif</h4>
<p>Wilayah Indonesia merupakan salah satu kawasan paling dinamis secara tektonik di muka bumi. Terjepit di antara tiga lempeng tektonik raksasa—<strong>Lempeng Indo-Australia</strong> yang bergerak ke utara (sekitar 6–7 cm/tahun), <strong>Lempeng Eurasia</strong> yang relatif statis, dan <strong>Lempeng Pasifik</strong> yang mendesak ke barat (sekitar 10–12 cm/tahun)—Nusantara dipenuhi ratusan sesar aktif dan jalur megathrust.</p>
<p>Di zona <strong>Megathrust Selat Sunda dan Mentawai</strong>, terjadi fenomena <em>seismic gap</em> (area yang terkunci dan belum melepaskan energi gempa besar selama ratusan tahun). Melalui pemantauan stasiun GPS kontinu BIG dan sensor seismograf BMKG, para ilmuwan memantau deformasi kerak bumi untuk merancang peta evakuasi dan standar bangunan tahan gempa nasional.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Tektonisme, Pergerakan Lempeng, dan Gempa Bumi
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/ryrXAGY1VJr?rel=0" title="Video Pembelajaran: Tektonisme Litosfer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari konveksi mantel bumi, batas lempeng konvergen-divergen-transform, dan pembentukan deretan gunung api Indonesia.
  </div>
</div>`
      },
      {
        id: "x05-t2",
        judul: "Topik 2: Vulkanisme, Seisme & Mitigasi Sesar Lembang",
        kuis_topik: {
          pertanyaan: "Sesar Lembang di Jawa Barat merupakan sesar aktif mendatar mengiri (sinistral strike-slip) sepanjang ±29 km yang membelah utara Cekungan Bandung. Upaya mitigasi tata ruang yang paling tepat adalah ...",
          opsi: [
            "Membangun kawasan industri berat di atas bidang patahan sesar",
            "Menetapkan zona sempadan patahan aktif bebas bangunan permanen dan memperketat standar konstruksi bangunan tahan gempa di sekitarnya",
            "Menggali seluruh jalur sesar hingga ke dasar mantel bumi",
            "Memindahkan seluruh penduduk Pulau Jawa ke pulau lain"
          ],
          kunci: 1,
          pembahasan: "Mitigasi keruangan sesar aktif darat mensyaratkan zonasi sempadan patahan (fault setback zone) sekitar puluhan meter di kiri-kanan bidang patahan yang disterilkan dari bangunan hunian dan infrastruktur kritis, serta edukasi simulasi evakuasi mandiri bagi warga."
        },
        html: `<h3>Vulkanisme dan Seisme di Indonesia</h3>
<p>Dengan lebih dari 120 gunung api aktif, Indonesia berada di jantung jalur <em>Ring of Fire</em> Pasifik. Vulkanisme membawa dua sisi:</p>
<ul>
  <li><strong>Dampak Destruktif:</strong> Awan panas guguran (pyroclastic flow), lahar hujan saat musim basah, dan hujan abu vulkanik lebat yang menghentikan penerbangan udara (seperti erupsi Gunung Ruang Sulawesi Utara dan Gunung Marapi Sumatra Barat).</li>
  <li><strong>Dampak Konstruktif:</strong> Abu vulkanik kaya unsur hara (kalium, kalsium, magnesium) yang lapuk menjadi tanah <em>andosol</em> sangat subur, sumber energi panas bumi (geothermal), serta bahan galian pasir dan batu berkualitas tinggi.</li>
</ul>`
      },
      {
        id: "x05-t3",
        judul: "Topik 3: Tenaga Eksogen, Mudstone IKN & Konservasi Tanah",
        kuis_topik: {
          pertanyaan: "Karakteristik batuan mudstone (batu lempung lunak) di kawasan perbukitan IKN Nusantara menuntut perlakuan geoteknik dan konservasi tanah khusus karena sifat fisiknya yang ...",
          opsi: [
            "Sangat keras seperti intan dan tidak bisa digali ekskavator",
            "Cepat mengembang saat basah terkena hujan lebat dan mudah retak-menyusut saat kering sehingga sangat rentan longsor di lereng galian",
            "Selalu mengeluarkan gas beracun secara terus menerus",
            "Menghisap seluruh air danau dalam hitungan detik"
          ],
          kunci: 1,
          pembahasan: "Batuan formasi Balikpapan di IKN didominasi lempung mudstone/shale yang rentan (slaking and swelling). Saat terpapar udara dan air hujan tropis, ikatan antarbutirnya melemah drastis, memicu keruntuhan lereng (mass wasting) jika tidak distabilkan dengan terasering dan perkuatan vegetatif (vetiver)."
        },
        html: `<h3>Dinamika Pedosfer dan Metode Konservasi Tanah</h3>
<p>Tanah terbentuk dari pelapukan batuan induk (pedogenesis) yang dipengaruhi faktor iklim, organisme, topografi, batuan induk, dan waktu. Untuk mencegah erosi dan degradasi lahan, diterapkan 3 metode konservasi tanah:</p>
<ol>
  <li><strong>Metode Vegetatif:</strong> Penanaman tanaman penutup tanah (cover crops), reboisasi lereng, tumpangsari (agroforestry), dan penanaman rumput akar wangi (vetiver) pada tebing jalan.</li>
  <li><strong>Metode Mekanik/Teknik Sipil:</strong> Pembuatan terasering (teras bangku), pembuatan saluran pembuangan air (SPA), parit jebakan sedimen (rorak), dan dinding penahan tebing (gabion/bronjong).</li>
  <li><strong>Metode Kimiawi:</strong> Penggunaan zat pemantap tanah (soil conditioner) dan pengapuran untuk menstabilkan struktur agregat tanah.</li>
</ol>`
      }
    ],
    glosarium: [
      { istilah: "Litosfer", arti: "Lapisan kerak bumi terluar yang padat dan kaku, terdiri atas kerak benua dan kerak samudra." },
      { istilah: "Megathrust", arti: "Zona kontak penunjaman antarlempeng tektonik konvergen yang berpotensi memicu gempa bumi bermagnitudo besar." },
      { istilah: "Vulkanisme", arti: "Peristiwa naiknya magma dari dalam litosfer menuju ke permukaan bumi." },
      { istilah: "Seisme", arti: "Getaran permukaan bumi yang diakibatkan oleh pelepasan energi gelombang seismik secara tiba-tiba." },
      { istilah: "Pedogenesis", arti: "Proses biologis dan kimiawi pembentukan tanah dari pelapukan batuan induk." },
      { istilah: "Terasering", arti: "Metode konservasi mekanik dengan membuat undakan bertingkat pada lahan miring untuk mengurangi kecepatan limpasan air." }
    ],
    soal: [
      {
        id: "x-05-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menghitung jarak episentrum gempa dengan rumus Laska",
        numerasi: "Perhitungan matematis selisih gelombang primer dan sekunder",
        stimulus: {
          jenis: "teks",
          judul: "Pencatatan Seismograf Stasiun Geofisika",
          isi: "<p>Sebuah stasiun BMKG mencatat gelombang primer (P) gempa bumi tiba pada pukul 08.20'15\" WIB. Gelombang sekunder (S) tiba di stasiun yang sama pada pukul 08.23'45\" WIB.</p>",
          sumber: "Pusat Gempa Nasional BMKG"
        },
        pertanyaan: "Berdasarkan rumus Laska Delta = ((S - P) - 1 menit) × 1.000 km, berapa jarak episentrum gempa dari stasiun pencatat tersebut?",
        opsi: [
          "1.500 km",
          "2.500 km",
          "3.500 km",
          "4.500 km"
        ],
        kunci: [1],
        pembahasan: "Selisih waktu (S - P) = 08.23'45\" - 08.20'15\" = 3 menit 30 detik (3,5 menit). Menggunakan rumus Laska: Delta = (3,5 menit - 1 menit) × 1.000 km = 2,5 × 1.000 km = 2.500 km."
      }
    ]
  },
  {
    id: "x-06",
    kelas: "X",
    urutan: 6,
    semester: 2,
    youtube_id: "1Z3bX0sF_8Q",
    fase: "E",
    elemen: "Pemahaman Konsep Atmosfer dan Perubahan Iklim",
    judul: "Dinamika Atmosfer dan Dampaknya terhadap Kehidupan",
    ringkasan: "Menyelami selubung udara bumi: lapisan atmosfer, unsur cuaca & angin monsun Nusantara, klasifikasi iklim (Köppen, Schmidt-Ferguson, Oldeman), anomali iklim global (El Niño/La Niña 2026), serta strategi mitigasi perubahan iklim di perkotaan.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu memahami struktur atmosfer dan dinamika unsur cuaca, menganalisis klasifikasi iklim dan pengaruhnya pada ketahanan pangan, menganalisis fenomena anomali iklim global terkini, serta merumuskan aksi mitigasi perubahan iklim.",
    tujuan: [
      "Menganalisis karakteristik dan fungsi lapisan atmosfer bumi (troposfer, stratosfer, mesosfer, termosfer, eksosfer).",
      "Menguraikan unsur-unsur cuaca (radiasi matahari, suhu, tekanan udara, sirkulasi angin monsun, kelembapan, awan, presipitasi).",
      "Membandingkan klasifikasi iklim matahari, iklim Köppen, iklim Schmidt-Ferguson, dan iklim Oldeman untuk kalender tanam padi.",
      "Menganalisis fenomena anomali iklim El Niño Southern Oscillation (ENSO), Indian Ocean Dipole (IOD), dan gelombang panas global 2026.",
      "Menilai dampak perubahan iklim terhadap ketahanan pangan dan merancang desain iklim mikro ruang terbuka hijau (RTH)."
    ],
    materi: [
      {
        id: "x06-t1",
        judul: "Topik 1: Struktur Lapisan Atmosfer & Unsur Cuaca",
        youtube_id: "1Z3bX0sF_8Q",
        kuis_topik: {
          pertanyaan: "Hampir seluruh fenomena cuaca (awan, hujan, badai petir, pelangi, dan kabut) berlangsung pada lapisan atmosfer terendah yang disebut ...",
          opsi: [
            "Stratosfer",
            "Troposfer",
            "Mesosfer",
            "Termosfer"
          ],
          kunci: 1,
          pembahasan: "Troposfer adalah lapisan atmosfer paling bawah (ketinggian 0–12 km di kutub, hingga 18 km di khatulistiwa) yang mengandung 80% massa udara dan uap air. Di sinilah terjadi dinamika konveksi dan seluruh fenomena cuaca bumi."
        },
        html: `<div class="bl-callout case">
<h4>🌡️ Anomali Atmosfer Aktual 2026: Rekor Suhu Global dan Tantangan El Niño/La Niña</h4>
<p>Dalam kurun waktu beberapa tahun terakhir, suhu rata-rata permukaan bumi terus mencetak rekor terpanas dalam sejarah modern. Kenaikan konsentrasi gas rumah kaca (CO2, CH4, N2O) menyebabkan efek rumah kaca semakin kuat, memicu penguapan air lebih masif dan memicu cuaca ekstrem yang semakin sukar diprediksi.</p>
<p>Bagi Indonesia, fenomena <strong>El Niño</strong> memicu kekeringan panjang dan gagal panen padi, sedangkan <strong>La Niña</strong> membawa curah hujan berlebih yang memicu banjir bandang dan longsor. Memahami dinamika atmosfer adalah kunci ketahanan pangan dan keselamatan bangsa.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Dinamika Atmosfer, Lapisan Udara, dan Iklim
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/1Z3bX0sF_8Q?rel=0" title="Video Pembelajaran: Dinamika Atmosfer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari siklus monsun, klasifikasi iklim, dan mekanisme perubahan iklim global.
  </div>
</div>`
      },
      {
        id: "x06-t2",
        judul: "Topik 2: Klasifikasi Iklim untuk Sektor Pertanian",
        kuis_topik: {
          pertanyaan: "Klasifikasi iklim Oldeman sangat praktis digunakan oleh petani di Indonesia karena mengelompokkan iklim berdasarkan kriteria bulan basah dan bulan kering yang didefinisikan sebagai ...",
          opsi: [
            "Bulan basah jika curah hujan > 200 mm/bulan, dan bulan kering jika curah hujan < 100 mm/bulan",
            "Bulan basah jika suhu udara > 30 derajat Celsius",
            "Bulan basah jika terjadi angin topan setiap hari",
            "Bulan basah jika tidak ada sinar matahari sama sekali"
          ],
          kunci: 0,
          pembahasan: "Oldeman mengklasifikasikan iklim berdasarkan kebutuhan air tanaman pangan: Bulan Basah (curah hujan > 200 mm/bulan, cukup untuk padi sawah), Bulan Lembap (100–200 mm/bulan), dan Bulan Kering (< 100 mm/bulan, membutuhkan irigasi tambahan)."
        },
        html: `<h3>Klasifikasi Iklim di Indonesia</h3>
<ol>
  <li><strong>Klasifikasi Köppen:</strong> Berdasarkan temperatur dan curah hujan serta asosiasi vegetasi alami. Indonesia didominasi tipe iklim <em>Af</em> (iklim hutan hujan tropis basah sepanjang tahun), <em>Am</em> (iklim monsun tropis dengan musim kemarau pendek), dan <em>Aw</em> (iklim sabana tropis dengan musim kemarau tegas seperti di NTT).</li>
  <li><strong>Klasifikasi Schmidt-Ferguson:</strong> Berdasarkan rasio nilai Q (perbandingan rata-rata jumlah bulan kering terhadap rata-rata jumlah bulan basah):
    <br><code>Q = (Rata-rata Bulan Kering / Rata-rata Bulan Basah) × 100%</code>
    <br>(Kriteria Mohr: Bulan Basah > 100 mm, Bulan Lembap 60–100 mm, Bulan Kering < 60 mm).
  </li>
  <li><strong>Klasifikasi Oldeman:</strong> Berorientasi pada kebutuhan kalender tanam padi dan palawija.</li>
</ol>`
      }
    ],
    glosarium: [
      { istilah: "Atmosfer", arti: "Lapisan selubung gas yang menyelimuti planet bumi dari permukaan hingga ruang angkasa." },
      { istilah: "Cuaca", arti: "Keadaan fisik atmosfer di tempat dan waktu tertentu yang berlangsung singkat dan dinamis." },
      { istilah: "Iklim", arti: "Rata-rata keadaan cuaca pada daerah yang luas dalam kurun waktu panjang (minimal 30 tahun)." },
      { istilah: "El Niño", arti: "Anomali pemanasan suhu permukaan laut di Samudra Pasifik tengah-timur yang memicu kekeringan di Indonesia." },
      { istilah: "La Niña", arti: "Anomali pendinginan suhu muka laut Pasifik yang memicu peningkatan curah hujan lebat di Indonesia." }
    ],
    soal: [
      {
        id: "x-06-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menghitung nilai Q iklim Schmidt-Ferguson",
        numerasi: "Perhitungan rasio persentase",
        stimulus: {
          jenis: "tabel",
          judul: "Data Curah Hujan Bulanan Stasiun Klimatologi (Rata-rata 10 Tahun)",
          isi: "<p>Berdasarkan data 10 tahun: Rata-rata Bulan Basah (curah hujan > 100 mm) = 8 bulan; Rata-rata Bulan Kering (curah hujan < 60 mm) = 2 bulan.</p>",
          sumber: "Stasiun Klimatologi BMKG"
        },
        pertanyaan: "Berapa nilai rasio Q dan masuk ke dalam tipe iklim apa wilayah tersebut menurut Schmidt-Ferguson?",
        opsi: [
          "Q = 25% (Tipe B: Basah)",
          "Q = 10% (Tipe A: Sangat Basah)",
          "Q = 50% (Tipe C: Agak Basah)",
          "Q = 75% (Tipe D: Sedang)"
        ],
        kunci: [0],
        pembahasan: "Q = (Bulan Kering / Bulan Basah) × 100% = (2 / 8) × 100% = 25%. Pada tabel Schmidt-Ferguson, nilai Q antara 14,3% s.d. 33,3% tergolong Iklim Tipe B (Basah)."
      }
    ]
  }
];

fs.writeFileSync(p05_06, JSON.stringify(babs05_06, null, 2), 'utf-8');
console.log('Successfully updated kelas-x/05-06.json (Semester 2)!');

// ===== 07-08.json (Semester 2) =====
const p07_08 = path.join(KELAS_X_DIR, '07-08.json');
const babs07_08 = [
  {
    id: "x-07",
    kelas: "X",
    urutan: 7,
    semester: 2,
    youtube_id: "8pU4H64o6d8",
    fase: "E",
    elemen: "Pemahaman Konsep Hidrosfer dan Konservasi Perairan",
    judul: "Dinamika Hidrosfer dan Konservasi Sumber Daya Air",
    ringkasan: "Menguak sirkulasi air bumi: siklus hidrologi, pengelolaan DAS terpadu (Ciliwung vs Sepaku), krisis amblesan tanah Pantura Jawa akibat ekstraksi air tanah dalam, dinamika danau & lahan basah gambut, serta oseanografi kelautan UNCLOS 1982 dan ARLINDO.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu memahami siklus hidrologi, menganalisis pengelolaan daerah aliran sungai (DAS) dan perairan darat, menganalisis krisis air tanah dan pesisir Pantura, serta memahami potensi oseanografi maritim Indonesia.",
    tujuan: [
      "Menguraikan siklus hidrologi (pendek, sedang, panjang) dan neraca air daerah aliran sungai (DAS).",
      "Membedakan pola pengaliran sungai (dendritik, trellis, rektangular, radial) dan morfologi meander.",
      "Menganalisis jenis-jenis danau (tektonik, vulkanik, karst, bendungan) dan fungsi ekologis lahan gambut.",
      "Mengevaluasi krisis penipisan air tanah dalam dan penurunan muka tanah (land subsidence) di Pantai Utara Jawa.",
      "Menganalisis relief dasar laut, salinitas, Arus Lintas Indonesia (ARLINDO), serta batas wilayah laut menurut UNCLOS 1982."
    ],
    materi: [
      {
        id: "x07-t1",
        judul: "Topik 1: Siklus Hidrologi Global & Pengelolaan DAS Terpadu",
        youtube_id: "8pU4H64o6d8",
        kuis_topik: {
          pertanyaan: "Pembangunan kawasan vila dan perumahan di daerah hulu DAS yang mengubah hutan resapan menjadi lantai semen kedap air akan menyebabkan perubahan hidrologis berupa ...",
          opsi: [
            "Infiltrasi air tanah meningkat drastis dan debit sungai mengecil",
            "Koefisien limpasan permukaan (runoff) melonjak tajam sehingga memicu banjir bandang kilat di kawasan hilir saat hujan deras",
            "Penguapan air laut terhenti secara permanen",
            "Mata air di hulu sungai mengalir lebih deras sepanjang tahun"
          ],
          kunci: 1,
          pembahasan: "Hilangnya tutupan vegetasi hutan di kawasan hulu menurunkan kapasitas infiltrasi air ke tanah secara signifikan. Akibatnya, air hujan langsung mengalir di permukaan sebagai limpasan (runoff) tinggi yang membebani kapasitas tampung sungai di hilir dan memicu banjir."
        },
        html: `<div class="bl-callout case">
<h4>💧 Studi Kasus Pantura Jawa 2026: Krisis Amblesan Tanah dan Intrusi Air Laut</h4>
<p>Kawasan pesisir Pantai Utara Jawa (Pantura)—khususnya Kota Semarang, Demak, dan Pekalongan—mengalami musibah ekologis berupa penurunan muka tanah (<em>land subsidence</em>) mencapai 10–15 cm per tahun. Akibatnya, jalan raya Pantura, pabrik, dan ribuan rumah warga terendam banjir rob pasang air laut setiap hari.</p>
<p>Kajian hidrologi membuktikan bahwa penyebab utama bukanlah murni pemanasan global, melainkan penyedotan air tanah dalam (deep groundwater extraction) secara tak terkendali oleh kawasan industri akibat belum tersedianya pasokan air bersih perpipaan dari pemerintah daerah. Solusi geografis mendesak: menghentikan penyedotan air tanah, merevitalisasi kawasan mangrove, dan membangun waduk penampung air permukaan.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Dinamika Hidrosfer, Air Tanah, Sungai, dan Samudra
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/8pU4H64o6d8?rel=0" title="Video Pembelajaran: Dinamika Hidrosfer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Eksplorasi siklus air, neraca hidrologi DAS, dinamika air tanah freatik dan artesis, serta oseanografi Indonesia.
  </div>
</div>`
      },
      {
        id: "x07-t2",
        judul: "Topik 2: Oseanografi Kelautan & Zona Batas Maritim UNCLOS 1982",
        kuis_topik: {
          pertanyaan: "Berdasarkan Konvensi Hukum Laut Internasional (UNCLOS 1982), batas Zona Ekonomi Eksklusif (ZEE) diukur sejauh ...",
          opsi: [
            "12 mil laut dari garis pangkal",
            "200 mil laut dari garis pangkal",
            "350 mil laut dari dasar samudra",
            "1.000 mil laut dari ibu kota negara"
          ],
          kunci: 1,
          pembahasan: "ZEE diukur sejauh 200 mil laut (±370,4 km) dari garis pangkal kepulauan. Pada zona ini, negara pantai memiliki hak berdaulat eksklusif untuk mengeksplorasi, mengeksploitasi, mengelola, dan mengonservasi sumber daya alam hayati dan non-hayati di kolom air dan dasar laut."
        },
        html: `<h3>Zona Batas Maritim Indonesia Berdasarkan UNCLOS 1982</h3>
<table>
  <thead>
    <tr><th>Zona Laut</th><th>Batas Jarak</th><th>Kedaulatan & Hak Berdaulat Negara Indonesia</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Laut Teritorial</strong></td>
      <td>12 mil laut dari garis pangkal</td>
      <td>Kedaulatan penuh negara atas air, ruang udara di atasnya, dasar laut, dan tanah di bawahnya (berlaku hak lintas damai kapal asing).</td>
    </tr>
    <tr>
      <td><strong>Zona Tambahan</strong></td>
      <td>24 mil laut dari garis pangkal</td>
      <td>Yurisdiksi khusus mencegah dan menindak pelanggaran bea cukai, fiskal, imigrasi, dan sanitasi kesehatan karantina.</td>
    </tr>
    <tr>
      <td><strong>Zona Ekonomi Eksklusif (ZEE)</strong></td>
      <td>200 mil laut dari garis pangkal</td>
      <td>Hak berdaulat eksklusif atas pemanfaatan sumber daya alam perikanan dan energi laut; kapal asing bebas berlayar melintas (freedom of navigation).</td>
    </tr>
    <tr>
      <td><strong>Landas Kontinen</strong></td>
      <td>Dasar laut kelanjutan benua hingga 200–350 mil laut</td>
      <td>Hak berdaulat atas sumber daya mineral minyak bumi, gas alam, dan mineral tambang di dasar laut dan tanah di bawahnya.</td>
    </tr>
  </tbody>
</table>`
      }
    ],
    glosarium: [
      { istilah: "Hidrosfer", arti: "Lapisan perairan di permukaan bumi, meliputi sungai, danau, rawa, air tanah, gletser, dan samudra." },
      { istilah: "Infiltrasi", arti: "Proses peresapan air permukaan ke dalam pori-pori tanah secara gravitasi." },
      { istilah: "Runoff", arti: "Aliran air permukaan yang mengalir di atas tanah menuju ke saluran sungai dan danau." },
      { istilah: "Land Subsidence", arti: "Penurunan elevasi muka tanah secara perlahan akibat pemadatan alami atau penyedotan air tanah dalam." },
      { istilah: "ZEE", arti: "Zona Ekonomi Eksklusif selebar 200 mil laut di mana negara pantai memiliki hak berdaulat atas sumber daya alam." }
    ],
    soal: [
      {
        id: "x-07-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis korelasi air tanah dan penurunan tanah di Pantura",
        numerasi: "Interpretasi laju penurunan tanah",
        stimulus: {
          jenis: "teks",
          judul: "Studi Deformasi Pesisir Semarang-Demak",
          isi: "<p>Pengukuran satelit radar InSAR dan GPS geodetik menunjukkan penurunan tanah di pesisir Kota Semarang bagian timur dan Demak mencapai 8–12 cm/tahun. Pada saat yang sama, pemantauan sumur pantau Kementerian ESDM mencatat muka air tanah dalam (akuifer tertekan pada kedalaman 100–150 meter) turun hingga 25 meter di bawah permukaan laut.</p>",
          sumber: "Badan Geologi & Pusat Air Tanah Kementerian ESDM"
        },
        pertanyaan: "Analisis manakah yang paling tepat menjelaskan keterkaitan fisik antara kedua fenomena di atas?",
        opsi: [
          "Penyedotan air tanah dalam yang berlebihan menyebabkan tekanan hidrolik pori batuan lempung aluvial menurun drastis, sehingga butiran tanah memadat dan permukaan tanah ambles",
          "Penurunan tanah semata-mata diakibatkan oleh gempa tektonik berkekuatan kecil",
          "Air tanah turun karena mengalir ke kawah gunung api aktif di pegunungan",
          "Penurunan tanah terjadi karena berat kapal nelayan yang bersandar di pelabuhan"
        ],
        kunci: [0],
        pembahasan: "Penurunan muka air tanah dalam akibat ekstraksi industri menghilangkan tekanan air pori (pore water pressure) yang sebelumnya menopang lapisan tanah endapan aluvial lunak. Butiran lempung kemudian mengalami pemadatan (kompaksi) permanen yang memicu amblesan tanah."
      }
    ]
  },
  {
    id: "x-08",
    kelas: "X",
    urutan: 8,
    semester: 2,
    youtube_id: "mUvS48n9v3U",
    fase: "E",
    elemen: "Pemahaman Konsep dan Mitigasi Kebencanaan",
    judul: "Mitigasi dan Adaptasi Bencana Kebumian Indonesia",
    ringkasan: "Membangun ketangguhan bangsa: profil kerentanan bencana Indonesia, siklus manajemen bencana komprehensif, platform geospasial InaRISK BNPB, sistem peringatan dini (EWS), serta kearifan lokal Smong Simeulue dan arsitektur vernakular tahan gempa.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu memahami konsep ancaman, kerentanan, kapasitas, dan risiko bencana; menganalisis siklus manajemen penanggulangan bencana; memanfaatkan data geospasial mitigasi bencana; serta menerapkan kearifan lokal dan aksi kesiapsiagaan menghadapi bencana.",
    tujuan: [
      "Menjelaskan rumus matematis risiko bencana: Risiko = (Bahaya × Kerentanan) / Kapasitas.",
      "Menguraikan siklus manajemen penanggulangan bencana: pra-bencana, saat tanggap darurat, dan pasca-bencana.",
      "Memanfaatkan platform digital WebGIS InaRISK BNPB untuk mengidentifikasi tingkat risiko bencana di lingkungan sekolah.",
      "Membedakan mitigasi struktural (tanggul, shelter evakuasi, bangunan tahan gempa) dan mitigasi non-struktural (kebijakan zonasi, edukasi, simulasi).",
      "Menganalisis kearifan lokal mitigasi bencana di Nusantara (Smong di Simeulue, Subak di Bali, rumah panggung tradisional)."
    ],
    materi: [
      {
        id: "x08-t1",
        judul: "Topik 1: Konsep Risiko Bencana & Siklus Manajemen Penanggulangan",
        youtube_id: "mUvS48n9v3U",
        kuis_topik: {
          pertanyaan: "Berdasarkan rumus baku risiko bencana R = (H × V) / C, cara yang paling efektif untuk menurunkan tingkat risiko bencana di suatu wilayah adalah ...",
          opsi: [
            "Meningkatkan kerentanan sosial dan ekonomi masyarakat",
            "Memperbesar kapasitas masyarakat melalui kesiapsiagaan, tata ruang aman, dan infrastruktur tangguh sembari mereduksi kerentanan",
            "Menunggu hingga bencana terjadi baru merencanakan mitigasi",
            "Menghapus seluruh lembaga penanggulangan bencana"
          ],
          kunci: 1,
          pembahasan: "Risiko (R) berbanding lurus dengan Bahaya/Hazard (H) dan Kerentanan/Vulnerability (V), serta berbanding terbalik dengan Kapasitas/Capacity (C). Karena ancaman alamiah (gempa) sulit dihilangkan, kunci penurunan risiko adalah menekan kerentanan (V) dan mendongkrak kapasitas (C) setinggi-tingginya."
        },
        html: `<div class="bl-callout case">
<h4>🛡️ Filosofi Penanggulangan Bencana Modern: Dari Responsif Menuju Preventif</h4>
<p>Dahulu, penanganan bencana di Indonesia bersifat <em>responsif</em>: pemerintah dan masyarakat baru bertindak setelah bencana terjadi (membagikan mie instan dan mendirikan tenda pengungsian). Namun dalam paradigma geografi kebencanaan modern, fokus utama telah bergeser menjadi <strong>Preventif dan Pengurangan Risiko Bencana (PRB)</strong>.</p>
<p>Setiap $1 yang diinvestasikan untuk mitigasi pra-bencana (seperti sistem peringatan dini, zonasi tata ruang bebas sesar, dan edukasi sekolah siaga bencana) terbukti mampu menghemat hingga $7 biaya pemulihan pasca-bencana dan menyelamatkan ribuan nyawa manusia.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Mitigasi Bencana Kebumian dan InaRISK BNPB
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/mUvS48n9v3U?rel=0" title="Video Pembelajaran: Mitigasi Bencana" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari siklus penanggulangan bencana, peta bahaya InaRISK, dan aksi kesiapsiagaan mandiri.
  </div>
</div>`
      },
      {
        id: "x08-t2",
        judul: "Topik 2: Kearifan Lokal Nusantara & Peringatan Dini Geospasial",
        kuis_topik: {
          pertanyaan: "Kearifan lokal masyarakat Pulau Simeulue di Aceh yang berhasil menyelamatkan hampir seluruh warganya saat Tsunami Samudra Hindia 2004 karena menghafal syair lisan turun-temurun tentang air laut surut tiba-tiba setelah gempa kuat dikenal dengan istilah ...",
          opsi: [
            "Subak",
            "Smong",
            "Pranata Mangsa",
            "Nyabuk Gunung"
          ],
          kunci: 1,
          pembahasan: "Kearifan lokal Smong di Simeulue berpesan: jika terjadi gempa bumi kuat dan air laut surut tiba-tiba, jangan mencari ikan yang terdampar di pantai, melainkan segera lari ke bukit yang lebih tinggi. Nilai kearifan ini terbukti sangat efektif sebagai sistem peringatan dini berbasis komunitas."
        },
        html: `<h3>Kearifan Lokal Mitigasi Bencana di Berbagai Daerah</h3>
<ul>
  <li><strong>Smong (Simeulue, Aceh):</strong> Tradisi tutur lisan yang mengajarkan evakuasi mandiri ke bukit ketika melihat air laut surut pasca-gempa kuat.</li>
  <li><strong>Rumah Adat Vernakular Tahan Gempa:</strong> Rumah Gadang Minangkabau (sambungan pasak kayu tanpa paku kaku), Omo Hada di Nias, dan Rumah Panggung Sasak yang elastis menyerap getaran seismik.</li>
  <li><strong>Nyabuk Gunung / Sengkedan (Jawa):</strong> Penanaman searah garis kontur untuk mencegah erosi dan longsor di lahan perbukitan.</li>
</ul>`
      }
    ],
    glosarium: [
      { istilah: "Mitigasi", arti: "Rangkaian upaya untuk mengurangi risiko bencana, baik melalui pembangunan fisik maupun penyadaran kemampuan menghadapi bencana." },
      { istilah: "Kesiapsiagaan", arti: "Rangkaian kegiatan yang dilakukan untuk mengantisipasi bencana melalui pengorganisasian langkah yang tepat guna." },
      { istilah: "Tanggap Darurat", arti: "Serangkaian kegiatan yang dilakukan segera pada saat kejadian bencana untuk menangani dampak buruk." },
      { istilah: "Smong", arti: "Kearifan lokal masyarakat Simeulue berupa peringatan dini tsunami berbasis cerita tutur turun temurun." }
    ],
    soal: [
      {
        id: "x-08-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Mengklasifikasikan tindakan mitigasi struktural dan non-struktural",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Program Pengurangan Risiko Bencana di Kabupaten Pesisir",
          isi: "<p>Pemerintah kabupaten menjalankan 4 program: (1) Penanaman sabuk hijau mangrove selebar 100 meter di sepanjang garis pantai; (2) Pembangunan shelter evakuasi vertikal bertingkat 4 dari beton bertulang; (3) Pelatihan simulasi evakuasi mandiri siswa sekolah setiap tanggal 26; (4) Penerbitan Perda Zonasi RTRW yang melarang pendirian hotel di sempadan pantai rawan tsunami.</p>",
          sumber: "BPBD Kabupaten Pesisir"
        },
        pertanyaan: "Manakah pasangan klasifikasi mitigasi yang tepat?",
        opsi: [
          "(1) dan (2) adalah mitigasi struktural; (3) dan (4) adalah mitigasi non-struktural",
          "(1) dan (3) adalah mitigasi struktural; (2) dan (4) adalah mitigasi non-struktural",
          "Seluruh program merupakan mitigasi darurat pasca bencana",
          "(4) adalah satu-satunya mitigasi struktural"
        ],
        kunci: [0],
        pembahasan: "Mitigasi struktural melibatkan rekayasa fisik/teknik/vegetatif (hutan mangrove dan bangunan shelter). Mitigasi non-struktural melibatkan regulasi hukum, kebijakan tata ruang, edukasi, dan simulasi kesiapsiagaan manusia."
      }
    ]
  }
];

fs.writeFileSync(p07_08, JSON.stringify(babs07_08, null, 2), 'utf-8');
console.log('Successfully updated kelas-x/07-08.json (Semester 2)!');
