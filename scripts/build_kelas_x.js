const fs = require('fs');
const path = require('path');

const KELAS_X_DIR = path.join(__dirname, '..', 'data', 'kurikulum', 'kelas-x');

// 1. Load existing 01-02.json to preserve Bab 1 rich content while updating semester & youtube_id
const file01_02 = path.join(KELAS_X_DIR, '01-02.json');
let raw01_02 = JSON.parse(fs.readFileSync(file01_02, 'utf-8'));

// Update Bab 1
raw01_02[0].semester = 1;
raw01_02[0].youtube_id = "2vK8s_aX49c";

// Upgrade Bab 2 (x-02)
raw01_02[1] = {
  id: "x-02",
  kelas: "X",
  urutan: 2,
  semester: 1,
  youtube_id: "_7Q3a7pWk3Y",
  fase: "E",
  elemen: "Pemahaman Konsep dan Keterampilan Proses Kartografi",
  judul: "Peta, Skala, Proyeksi, dan Membaca Ruang",
  ringkasan: "Menguasai literasi kartografi modern: komponen peta standar ICA, perhitungan skala matematis, proyeksi & analisis distorsi permukaan bumi, membaca peta kontur topografi, serta implementasi Kebijakan Satu Peta (One Map Policy) dan analisis trase jalur Kereta Cepat Whoosh 2026.",
  estimasi: "6 JP",
  cp: "Peserta didik mampu memahami komponen kartografi, menghitung dan mengonversi skala, menganalisis distorsi proyeksi peta, membaca kontur dan kelerengan lereng, serta memanfaatkan data peta digital dalam perencanaan spasial nyata.",
  tujuan: [
    "Menjelaskan 10 komponen kelengkapan peta standar kartografi internasional (ICA) dan Kebijakan Satu Peta (One Map Policy).",
    "Menghitung konversi skala numerik, grafis, dan verbal serta estimasi jarak dan luas sebenarnya di permukaan bumi.",
    "Menganalisis jenis-jenis proyeksi peta (silinder, kerucut, azimutal) beserta distorsi konform, ekuidistan, dan ekuivalen.",
    "Menginterpretasikan peta kontur topografi, menghitung interval kontur (IK), dan menghitung persentase kemiringan lereng untuk trase transportasi Kereta Cepat Whoosh.",
    "Menilai kualitas peta tematik secara kritis berdasarkan kelengkapan metadata spasial."
  ],
  materi: [
    {
      id: "x02-t1",
      judul: "Topik 1: Hakikat Peta, Komponen Kartografi & Kebijakan Satu Peta 2026",
      youtube_id: "_7Q3a7pWk3Y",
      kuis_topik: {
        pertanyaan: "Mengapa program Kebijakan Satu Peta (One Map Policy) sangat krusial bagi kepastian hukum dan tata ruang di Indonesia?",
        opsi: [
          "Agar seluruh peta di Indonesia hanya dicetak menggunakan satu percetakan negara",
          "Untuk menyelesaikan tumpang tindih izin konsesi tambang, perkebunan, dan kawasan hutan melalui satu basis data geospasial tunggal terverifikasi",
          "Untuk menghapus seluruh fungsi peta topografi dan menggantikannya dengan peta wisata",
          "Agar seluruh wilayah Indonesia diwajibkan menggunakan proyeksi peta kutub"
        ],
        kunci: 1,
        pembahasan: "Kebijakan Satu Peta (One Map Policy) yang diatur Perpres dibuat untuk mengatasi konflik tumpang tindih izin pemanfaatan ruang (overlaid concessions) antara kehutanan, pertambangan, dan perkebunan dengan menggunakan satu referensi geospasial tunggal, satu standar, satu basis data, dan satu geoportal terpadu (KSP BRIN/BIG)."
      },
      html: `<div class="bl-callout case">
<h4>📌 Konteks Geospasial 2026: Kebijakan Satu Peta (One Map Policy) Mengatasi Tumpang Tindih Ruang</h4>
<p>Dalam sejarah tata ruang Indonesia, ribuan sengketa agraria dan kerusakan lingkungan berakar dari <em>peta sektoral yang berbeda-beda</em>. Kementerian Lingkungan Hidup dan Kehutanan memiliki peta kawasan hutan sendiri, Kementerian ESDM memiliki peta izin usaha pertambangan sendiri, dan Kementerian ATR/BPN memiliki peta hak guna usaha (HGU) perkebunan sendiri. Akibat skala dan datum geodesi yang berlainan, satu hektare lahan hutan lindung bisa tumpang tindih dengan izin tambang dan pemukiman warga.</p>
<p>Melalui <strong>Kebijakan Satu Peta (One Map Policy)</strong> berskala 1:50.000, pemerintah menyatukan seluruh informasi geospasial tematik (IGT) ke dalam satu geoportal resmi yang dikelola Badan Informasi Geospasial (BIG). Inilah bukti nyata bahwa kartografi bukan sekadar menggambar garis, melainkan instrumen hukum tata kelola kedaulatan negara.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Kartografi Dasar, Komponen Peta, dan Cara Membaca Ruang
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/_7Q3a7pWk3Y?rel=0" title="Video Pembelajaran: Kartografi Dasar" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari anatomi kartografi: skala, arah orientasi, legenda simbol, dan cara membaca fenomena ruang permukaan bumi.
  </div>
</div>

<h3>Komponen Standar Kartografi Internasional</h3>
<p>Sebuah peta dikatakan laik secara ilmiah apabila memenuhi 10 komponen pokok:</p>
<ol>
  <li><strong>Judul Peta:</strong> Menunjukkan isi utama, wilayah, dan tahun data (misal: <em>Peta Kerentanan Longsor Kabupaten Bogor Tahun 2026</em>).</li>
  <li><strong>Skala Peta:</strong> Rasio matematis jarak di peta terhadap jarak horizontal sebenarnya di lapangan.</li>
  <li><strong>Petunjuk Arah (Orientasi):</strong> Menunjukkan arah utara geografis (True North), utara magnetik (Magnetic North), dan utara grid (Grid North).</li>
  <li><strong>Legenda:</strong> Kunci interpretasi yang menerangkan arti setiap simbol titik, garis, dan warna area.</li>
  <li><strong>Garis Astronomis (Grid):</strong> Garis lintang (latitude) dan garis bujur (longitude) atau koordinat UTM (Universal Transverse Mercator).</li>
  <li><strong>Inset Peta:</strong> Peta berukuran kecil yang memperlihatkan kedudukan daerah yang dipetakan dalam konteks wilayah yang lebih luas.</li>
  <li><strong>Sumber dan Tahun Pembuatan:</strong> Menunjukkan otoritas penyedia data (misal: BIG, BMKG, Kementerian ATR/BPN) serta validitas temporalnya.</li>
  <li><strong>Lettering (Tata Huruf):</strong> Kaidah penulisan nama geografis (nama perairan miring/italic warna biru, nama ibu kota huruf kapital tegak).</li>
  <li><strong>Garis Tepi (Border):</strong> Bingkai rapi pembatas wilayah gambar kartografis.</li>
  <li><strong>Warna Kartografis:</strong> Mengikuti konvensi (cokelat = ketinggian/pegunungan, hijau = dataran rendah/vegetasi, biru = perairan, merah = permukiman/jalan utama).</li>
</ol>`
    },
    {
      id: "x02-t2",
      judul: "Topik 2: Skala Matematis, Perhitungan Jarak & Generalisasi Kartografis",
      kuis_topik: {
        pertanyaan: "Pada peta berskala 1:25.000, jarak lurus antara dua stasiun adalah 8 cm. Berapa jarak sebenarnya di lapangan?",
        opsi: [
          "200 meter",
          "2 kilometer",
          "20 kilometer",
          "200 kilometer"
        ],
        kunci: 1,
        pembahasan: "Jarak sebenarnya = Jarak peta × Penyebut skala = 8 cm × 25.000 = 200.000 cm = 2.000 meter = 2 km."
      },
      html: `<h3>1. Tiga Bentuk Skala</h3>
<p>Skala merupakan rasio pengecilan permukaan bumi yang matematis. Tiga bentuk penyajiannya:</p>
<ul>
  <li><strong>Skala Numerik (Angka):</strong> Dinyatakan dalam pecahan perbandingan, contoh: <code>1:50.000</code>. Artinya 1 cm di peta mewakili 50.000 cm (500 meter) di medan nyata.</li>
  <li><strong>Skala Verbal (Kalimat):</strong> Dinyatakan dengan kata-kata, contoh: <em>"1 sentimeter mewakili 1 kilometer"</em>.</li>
  <li><strong>Skala Grafis (Batang):</strong> Disajikan dalam bentuk garis/batang yang dibagi dalam ruas-ruas berjarak sama. Keunggulan skala grafis: <em>tetap akurat meski peta diperbesar atau diperkecil melalui fotokopi atau proyeksi layar digital</em>.</li>
</ul>

<div class="bl-diagram-box" style="border:1px solid #cbd5e1;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);border-radius:14px;padding:16px;margin:16px 0">
  <h4 style="margin:0 0 10px;font-size:14px;color:#0f172a">Rumus Kunci Kartometri</h4>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
      <strong style="color:#0d9488">Jarak Sebenarnya (JS)</strong>
      <p style="margin:4px 0 0;font-size:12px;color:#475569"><code>JS = Jarak Peta (JP) × Penyebut Skala</code></p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
      <strong style="color:#2563eb">Mencari Skala Baru</strong>
      <p style="margin:4px 0 0;font-size:12px;color:#475569"><code>P2 = (JP1 / JP2) × P1</code></p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
      <strong style="color:#7c3aed">Skala Berdasar Garis Lintang</strong>
      <p style="margin:4px 0 0;font-size:12px;color:#475569"><code>1° Lintang = 111 km = 11.100.000 cm</code></p>
    </div>
  </div>
</div>

<h3>2. Hierarki Skala dan Prinsip Generalisasi</h3>
<table>
  <thead>
    <tr><th>Tingkat Skala</th><th>Rentang Skala</th><th>Contoh Pemanfaatan Spasial</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>Kadaster (Sangat Besar)</strong></td><td>1:100 s.d. 1:5.000</td><td>Sertifikat hak milik tanah BPN, denah zonasi gedung IKN.</td></tr>
    <tr><td><strong>Skala Besar</strong></td><td>1:5.000 s.d. 1:250.000</td><td>Rencana Detail Tata Ruang (RDTR) kota, peta topografi kecamatan.</td></tr>
    <tr><td><strong>Skala Sedang</strong></td><td>1:250.000 s.d. 1:500.000</td><td>Peta Rencana Tata Ruang Wilayah (RTRW) tingkat provinsi.</td></tr>
    <tr><td><strong>Skala Kecil</strong></td><td>1:500.000 s.d. 1:1.000.000</td><td>Peta kepulauan Nusantara, peta administrasi negara Indonesia.</td></tr>
    <tr><td><strong>Geografis (Sangat Kecil)</strong></td><td>&gt; 1:1.000.000</td><td>Peta persebaran benua, peta sirkulasi iklim dunia (Atlas).</td></tr>
  </tbody>
</table>`
    },
    {
      id: "x02-t3",
      judul: "Topik 3: Sistem Proyeksi Peta & Analisis Distorsi Geometris",
      kuis_topik: {
        pertanyaan: "Mengapa wilayah Indonesia yang terletak di kawasan khatulistiwa paling tepat dipetakan menggunakan proyeksi silinder normal konform?",
        opsi: [
          "Karena bidang proyeksi silinder menyinggung bumi tepat di garis ekuator sehingga distorsi bentuknya mendekati nol",
          "Karena wilayah khatulistiwa memiliki suhu udara yang sangat tinggi dan banyak gunung api",
          "Karena proyeksi silinder selalu mengubah bentuk daratan menjadi persegi panjang",
          "Karena proyeksi kerucut hanya boleh digunakan untuk wilayah perairan laut dalam"
        ],
        kunci: 0,
        pembahasan: "Bidang silinder normal memiliki garis singgung tepat pada lingkaran ekuator (0° lintang). Karena bidang singgung merupakan area dengan distorsi paling minimal (skala faktor = 1), proyeksi silinder (seperti Mercator atau UTM) paling ideal dan akurat untuk memetakan kepulauan Indonesia."
      },
      html: `<h3>1. Hakikat Proyeksi Peta</h3>
<p>Bumi adalah bola pejal yang melengkung (geoid/ellipsoid 3 dimensi), sedangkan peta adalah bidang datar 2 dimensi. Secara matematis, mustahil mendatarkan permukaan bola tanpa merobek, meregangkan, atau melipatnya. Oleh karena itu, <strong>proyeksi peta</strong> adalah metode transformasi matematis untuk memindahkan koordinat bola bumi ke atas bidang datar.</p>

<div class="bl-callout concept">
<h4>Hukum Tiga Syarat Ideal Kartografi</h4>
<p>Tidak ada satu pun proyeksi yang mampu memenuhi ketiga syarat ini sekaligus secara sempurna di seluruh permukaan bumi:</p>
<ul>
  <li><strong>Konform (Conform):</strong> Bentuk wilayah di peta harus sebangun dan menyerupai bentuk aslinya di bumi.</li>
  <li><strong>Ekuidistan (Equidistant):</strong> Jarak antartitik di peta setelah dikalikan skala harus sebanding dengan jarak sebenarnya di medan lapangan.</li>
  <li><strong>Ekuivalen (Equivalent / Equal-Area):</strong> Luas bidang area di peta setelah dihitung skalanya harus sama dengan luas permukaan aslinya di bumi.</li>
</ul>
</div>

<h3>2. Klasifikasi Proyeksi Berdasarkan Bidang Proyeksi</h3>
<table>
  <thead>
    <tr><th>Jenis Bidang</th><th>Ciri & Bidang Singgung</th><th>Kawasan Paling Ideal</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Proyeksi Silinder (Cylindrical)</strong></td>
      <td>Memakai tabung silinder yang membungkus bola bumi. Garis bujur sejajar tegak lurus garis lintang.</td>
      <td><strong>Kawasan Khatulistiwa / Ekuator (Tropis)</strong> seperti Indonesia, Kongo, Brasil.</td>
    </tr>
    <tr>
      <td><strong>Proyeksi Kerucut (Conical)</strong></td>
      <td>Memakai kerucut yang menyinggung garis lintang standar (misal 30°–60°).</td>
      <td><strong>Wilayah Lintang Sedang</strong> yang memanjang timur–barat seperti Eropa Barat, Amerika Serikat, dan Tiongkok.</td>
    </tr>
    <tr>
      <td><strong>Proyeksi Azimutal (Zenital)</strong></td>
      <td>Memakai bidang datar yang menempel langsung pada satu titik pusat bumi.</td>
      <td><strong>Wilayah Kutub (Kutub Utara & Selatan)</strong> dan navigasi penerbangan rute lingkaran besar (great circle).</td>
    </tr>
  </tbody>
</table>`
    },
    {
      id: "x02-t4",
      judul: "Topik 4: Membaca Kontur Topografi & Analisis Trase Kereta Cepat Whoosh",
      kuis_topik: {
        pertanyaan: "Dalam perencanaan jalur Kereta Cepat Jakarta-Bandung (Whoosh) di sekitar Padalarang, para insinyur geospasial menganalisis kerapatan kontur lereng perbukitan terjal. Mengapa kereta cepat berkecepatan 350 km/jam mensyaratkan kelerengan trase maksimal kurang dari 3%?",
        opsi: [
          "Agar penumpang tidak mengalami mabuk udara saat melewati perbukitan",
          "Karena keterbatasan daya cengkeram roda baja di rel pada kecepatan tinggi dan risiko kegagalan pengereman di lereng curam, sehingga lereng terjal harus ditembus terowongan (tunnel)",
          "Karena kereta cepat Whoosh hanya dapat berjalan pada tanah gambut yang rata",
          "Agar biaya tiket kereta dapat ditekan serendah mungkin oleh pemerintah"
        ],
        kunci: 1,
        pembahasan: "Kereta cepat roda baja memiliki batas gradien elevasi kritis (maksimal 2,5–3%). Tanjakan curam akan menyebabkan roda selip (slip) dan turunan curam membahayakan pengereman kinetik pada kelajuan 350 km/jam. Oleh sebab itu, insinyur geografi dan sipil menggunakan analisis kontur untuk merancang 13 terowongan menembus bukit batuan terjal di Jawa Barat."
      },
      html: `<div class="bl-callout case">
<h4>🚅 Fenomena Geografis Nyata: Analisis Kontur Trase Whoosh Jakarta-Bandung</h4>
<p>Pembangunan megaproyek <strong>Kereta Cepat Jakarta-Bandung (Whoosh)</strong> merupakan laboratorium nyata penerapan analisis peta kontur topografi. Rute kereta cepat harus melintasi bentang alam Jawa Barat yang bervariasi: mulai dari dataran rendah aluvial Jakarta–Karawang (ketinggian 0–50 mdpl), merayap ke perbukitan vulkanik terlipat Purwakarta–Padalarang (ketinggian 100–700 mdpl), hingga cekungan antar-gunung Bandung (650–720 mdpl).</p>
<p>Karena kereta Whoosh melaju pada kecepatan 350 km/jam, kelokan tajam dan tanjakan curam di atas 3% dilarang keras. Melalui pemetaan topografi kontur rapat di Purwakarta dan Bandung Barat, tim perencana memutuskan membangun <strong>13 terowongan (tunnel)</strong> menembus bukit dan puluhan kilometer jembatan layang (viaduct) tinggi untuk menjaga elevasi trase tetap landai dan aman.</p>
</div>

<h3>Kaidah Perhitungan Peta Kontur</h3>
<p><strong>Garis kontur</strong> adalah garis khayal pada peta yang menghubungkan titik-titik dengan ketinggian yang sama di atas permukaan air laut rata-rata (mdpl).</p>
<ol>
  <li><strong>Interval Kontur (Contour Interval / CI):</strong> Jarak vertikal beda tinggi antara dua garis kontur yang bertetangga.
    <br><code>CI = 1 / 2000 × Penyebut Skala Peta</code>
    <br><em>Contoh:</em> Pada peta topografi skala 1:50.000, <code>CI = 1/2000 × 50.000 = 25 meter</code>.
  </li>
  <li><strong>Karakteristik Kemiringan Lereng:</strong>
    <ul>
      <li><strong>Kontur Rapat:</strong> Menandakan lereng yang sangat curam/terjal (tebing atau lereng patahan).</li>
      <li><strong>Kontur Renggang:</strong> Menandakan medan yang landai atau datar (dataran aluvial/lembah).</li>
      <li><strong>Kontur Berbentuk Huruf V Menunjuk ke Hulu/Puncak:</strong> Menandakan lembah aliran sungai.</li>
      <li><strong>Kontur Berbentuk Huruf U Menunjuk ke Hilir:</strong> Menandakan punggung bukit (ridge).</li>
    </ul>
  </li>
  <li><strong>Rumus Menghitung Kemiringan Lereng (Slope %):</strong>
    <br><code>Kemiringan (%) = (Beda Tinggi / Jarak Datar Lapangan) × 100%</code>
  </li>
</ol>`
    }
  ],
  glosarium: [
    { istilah: "Kartografi", arti: "Seni, ilmu, dan teknik pembuatan serta penggunaan peta secara ilmiah." },
    { istilah: "Interval Kontur (CI)", arti: "Selisih beda tinggi vertikal antara dua garis kontur yang berdekatan pada peta topografi." },
    { istilah: "One Map Policy", arti: "Kebijakan nasional penyatuan informasi geospasial tematik menjadi satu referensi tunggal standar di Indonesia." },
    { istilah: "Proyeksi Silinder", arti: "Proyeksi permukaan bumi menggunakan bidang tabung silinder, sangat ideal memetakan wilayah khatulistiwa." },
    { istilah: "Konform", arti: "Sifat proyeksi yang mempertahankan keaslian bentuk wilayah permukaan bumi pada peta." },
    { istilah: "Trase", arti: "Rencana garis sumbu jalur jalan atau rel kereta api pada peta tata ruang permukaan bumi." }
  ],
  soal: raw01_02[1].soal || []
};

// Write updated 01-02.json
fs.writeFileSync(file01_02, JSON.stringify(raw01_02, null, 2), 'utf-8');
console.log('Successfully updated kelas-x/01-02.json with semester 1 and youtube_id!');
