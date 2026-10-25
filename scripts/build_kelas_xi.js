const fs = require('fs');
const path = require('path');

const KELAS_XI_DIR = path.join(__dirname, '..', 'data', 'kurikulum', 'kelas-xi');

// ===== 01-02.json (Semester 1) =====
const babs01_02 = [
  {
    id: "xi-01",
    kelas: "XI",
    urutan: 1,
    semester: 1,
    youtube_id: "h5_J7G1aH9k",
    fase: "F",
    elemen: "Pemahaman Konsep Poros Maritim dan Geopolitik",
    judul: "Posisi Strategis Indonesia dan Potensi Kemaritiman Dunia",
    ringkasan: "Menelaah geopolitik kepulauan: letak astronomis, geografis, dan geologis Indonesia; Alur Laut Kepulauan Indonesia (ALKI I, II, III); potensi ekonomi biru kelautan; serta kedaulatan ZEE perairan Natuna Utara 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis letak strategis wilayah Indonesia sebagai poros maritim dunia, potensi sumber daya kelautan dan batas maritim, serta peran Indonesia dalam jalur perdagangan internasional.",
    tujuan: [
      "Menganalisis letak astronomis, geografis di antara dua benua dan dua samudra, serta implikasi geologisnya.",
      "Menguraikan penetapan Alur Laut Kepulauan Indonesia (ALKI I, II, III) sebagai urat nadi pelayaran kapal dunia.",
      "Mengevaluasi potensi ekonomi maritim: perikanan tangkap, energi kelautan terbarukan (arus laut/OTEC), dan tol laut logistik.",
      "Menganalisis dinamika geopolitik penegakan kedaulatan di Zona Ekonomi Eksklusif (ZEE) Laut Natuna Utara terkini.",
      "Merumuskan strategi pengembangan Indonesia sebagai Poros Maritim Dunia yang berkelanjutan."
    ],
    materi: [
      {
        id: "xi01-t1",
        judul: "Topik 1: Letak Geografis, ALKI & Poros Maritim Dunia 2026",
        youtube_id: "h5_J7G1aH9k",
        kuis_topik: {
          pertanyaan: "Mengapa Selat Malaka dan ALKI II (melintasi Selat Lombok dan Selat Makassar) memegang peranan geopolitik sangat vital dalam perdagangan energi dunia?",
          opsi: [
            "Karena di kedua selat tersebut tidak pernah terjadi badai angin laut",
            "Karena merupakan jalur transit utama kapal tanker pengangkut minyak mentah dan logistik global antara Timur Tengah, Asia Timur (Jepang, Tiongkok, Korsel), dan Australia",
            "Karena seluruh kapal asing diwajibkan membeli bahan bakar hanya di pelabuhan Indonesia",
            "Karena kedalaman laut di ALKI II hanya 5 meter sehingga aman untuk berenang"
          ],
          kunci: 1,
          pembahasan: "ALKI II (Selat Lombok - Selat Makassar) merupakan jalur laut dalam internasional bebas hambatan yang dilewati kapal supertanker bermuatan ratusan ribu ton (VLCC) yang tidak muat melintasi Selat Malaka yang relatif dangkal. Ini menempatkan Indonesia pada posisi tawar geopolitik maritim yang sangat tinggi."
        },
        html: `<div class="bl-callout case">
<h4>🌊 Geopolitik Maritim 2026: Dinamika Keamanan Selat Malaka & Laut Natuna Utara</h4>
<p>Dengan lebih dari 17.500 pulau dan garis pantai terpanjang kedua di dunia, Indonesia mengontrol 4 dari 9 <em>chokepoints</em> (titik sempit maritim strategis) dunia: Selat Malaka, Selat Sunda, Selat Lombok, dan Selat Makassar. Lebih dari 40% perdagangan lintas samudra dunia melintasi perairan kepulauan Nusantara.</p>
<p>Di kawasan <strong>Laut Natuna Utara</strong>, penegakan hak berdaulat Zona Ekonomi Eksklusif (ZEE) 200 mil laut terus diperkuat melalui patroli Badan Keamanan Laut (Bakamla) dan TNI AL guna melindungi cadangan gas alam raksasa Blok Natuna D-Alpha dan kekayaan perikanan tangkap lestari dari eksploitasi kapal nelayan asing ilegal (IUU Fishing).</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Posisi Strategis Maritim Indonesia dan Potensi Kelautan Dunia
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/h5_J7G1aH9k?rel=0" title="Video Pembelajaran: Maritim Indonesia" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Eksplorasi ALKI, batas laut teritorial, ZEE, dan visi poros maritim dunia.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Poros Maritim Dunia", arti: "Visi strategis pembangunan Indonesia berbasis kelautan untuk menjadi kekuatan maritim berdaulat dan maju." },
      { istilah: "ALKI", arti: "Alur Laut Kepulauan Indonesia yang ditetapkan untuk perlintasan damai kapal internasional." },
      { istilah: "ZEE", arti: "Zona Ekonomi Eksklusif 200 mil laut untuk pemanfaatan sumber daya alam kelautan." },
      { istilah: "Chokepoint", arti: "Titik sempit jalur pelayaran maritim internasional yang memiliki nilai strategis militer dan ekonomi tinggi." }
    ],
    soal: [
      {
        id: "xi-01-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis rute ALKI dalam perdagangan logistik internasional",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Perbandingan Rute ALKI I, II, dan III",
          isi: "<p>Indonesia menetapkan 3 alur laut kepulauan: ALKI I (Selat Sunda - Selat Karimata), ALKI II (Selat Lombok - Selat Makassar), dan ALKI III (Laut Maluku/Laut Banda - Laut Sawu/Laut Timor).</p>",
          sumber: "Dishidros TNI AL"
        },
        pertanyaan: "Kapal tanker raksasa bermuatan 300.000 ton dari Timur Tengah menuju Tiongkok lebih memilih melewati ALKI II daripada Selat Malaka karena ...",
        opsi: [
          "Kedalaman dan lebar alur di ALKI II sangat mencukupi bagi kapal bertonase raksasa tanpa risiko kandas di dasar selat",
          "ALKI II memiliki jarak tempuh yang lebih dekat ke Benua Eropa",
          "Selat Malaka ditutup permanen untuk seluruh kapal asing",
          "ALKI II tidak memiliki ombak sama sekali"
        ],
        kunci: [0],
        pembahasan: "Selat Malaka memiliki batas draught kapal maksimal ±20 meter (Malaccamax). Kapal supertanker (VLCC/ULCC) dengan sarat air sangat dalam memilih ALKI II (Selat Lombok-Makassar) yang berkedalaman ratusan meter sehingga aman dari risiko benturan dasar karang."
      }
    ]
  },
  {
    id: "xi-02",
    kelas: "XI",
    urutan: 2,
    semester: 1,
    youtube_id: "oJk8kG4sD1Q",
    fase: "F",
    elemen: "Pemahaman Konsep Biosfer dan Konservasi Hayati",
    judul: "Dinamika Biosfer: Sebaran Bioma, Flora, dan Fauna Dunia",
    ringkasan: "Menjelajahi keanekaragaman hayati: faktor persebaran biosfer, bioma dunia (hutan hujan, sabana, taiga, tundra), garis pembagi Wallace-Weber-Lydekker, konservasi Orangutan & koridor overpass satwa IKN Nusantara 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis sebaran bioma dunia dan keanekaragaman hayati flora-fauna Indonesia, mengevaluasi ancaman kepunahan spesies endemik, serta merancang solusi konservasi in-situ dan ex-situ.",
    tujuan: [
      "Menganalisis pengaruh faktor klimatik, edafik, fisiografik, dan biotik terhadap persebaran makhluk hidup.",
      "Membandingkan ciri adaptasi morfologis vegetasi pada bioma hutan hujan tropis, sabana, taiga, dan tundra.",
      "Menguraikan sejarah biogeografi Paparan Sunda, Paparan Sahul, dan zona Wallacea di Indonesia.",
      "Menganalisis isu kepunahan spesies endemik akibat deforestasi dan perburuan liar.",
      "Merumuskan strategi konservasi keanekaragaman hayati: cagar alam, suaka margasatwa, dan koridor satwa IKN Nusantara."
    ],
    materi: [
      {
        id: "xi02-t1",
        judul: "Topik 1: Bioma Dunia, Garis Wallace-Weber & Konservasi IKN 2026",
        youtube_id: "oJk8kG4sD1Q",
        kuis_topik: {
          pertanyaan: "Zona Wallacea (Sulawesi, Maluku, Nusa Tenggara) memiliki keunikan biologis yang sangat tinggi dibanding kawasan lain di Indonesia karena ...",
          opsi: [
            "Merupakan kawasan perairan laut dalam yang tidak pernah tersambung daratan dengan Asia maupun Australia, sehingga melahirkan spesies endemik unik seperti anoa, babirusa, dan komodo",
            "Hanya dihuni oleh hewan-hewan berkantung dari kutub utara",
            "Merupakan kawasan gurun pasir terluas di Asia Tenggara",
            "Seluruh floranya didatangkan dari benua Amerika"
          ],
          kunci: 0,
          pembahasan: "Zona Wallacea dibatasi oleh Garis Wallace di barat dan Garis Weber/Lydekker di timur. Karena terisolasi laut dalam sejak era glasial Pleistosen, hewan dan tumbuhan di zona ini berevolusi secara mandiri menghasilkan persentase fauna endemik tertinggi di Indonesia."
        },
        html: `<div class="bl-callout case">
<h4>🐒 Konservasi Terkini 2026: Koridor Satwa Liar Smart Forest City IKN</h4>
<p>Dalam pembangunan Ibu Kota Nusantara di Kalimantan Timur, habitat alami satwa kunci seperti <strong>Orangutan Kalimantan (Pongo pygmaeus)</strong>, <strong>Bekantan (Nasalis larvatus)</strong>, dan Macan Dahan terancam terfragmentasi oleh jaringan jalan tol Balikpapan–IKN.</p>
<p>Untuk mencegah keterisolasian genetik satwa, pemerintah membangun <strong>Jembatan Kanopi Penyeberangan Satwa (Wildlife Overpass/Underpass)</strong> buatan di atas jalan tol yang ditanami pohon-pohon pakan alami. Ini merupakan terobosan integrasi perencanaan teknik sipil dengan kaidah biogeografi biosfer.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Biosfer, Persebaran Bioma Dunia, dan Fauna Indonesia
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/oJk8kG4sD1Q?rel=0" title="Video Pembelajaran: Biosfer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari pembagian bioma dunia, garis Wallace-Weber, dan upaya perlindungan satwa endemik Indonesia.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Biosfer", arti: "Lapisan permukaan bumi dan atmosfer tempat berlangsungnya seluruh sistem kehidupan hayati." },
      { istilah: "Bioma", arti: "Ekosistem terestrial berskala luas yang dicirikan oleh iklim spesifik dan bentuk vegetasi dominan." },
      { istilah: "Garis Wallace", arti: "Garis batas biogeografi pemisah fauna Asiatis (Paparan Sunda) dengan fauna Peralihan." },
      { istilah: "Endemik", arti: "Spesies flora atau fauna yang hanya dapat dijumpai secara alami di satu wilayah geografis tertentu." }
    ],
    soal: [
      {
        id: "xi-02-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis dampak fragmentasi habitat terhadap keanekaragaman genetik",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Studi Dampak Pembangunan Jalan Tol terhadap Populasi Primata",
          isi: "<p>Pembangunan jalan raya selebar 60 meter membelah kawasan hutan lindung menjadi dua petak terpisah. Hasil monitoring 3 tahun menunjukkan terjadi perkawinan sedarah (inbreeding depression) pada kelompok primata karena tidak dapat menyeberang jalan.</p>",
          sumber: "Pusat Riset Biosistematika dan Evolusi BRIN"
        },
        pertanyaan: "Solusi mitigasi biogeografi yang paling tepat untuk mengatasi masalah fragmentasi habitat tersebut adalah ...",
        opsi: [
          "Membangun jembatan kanopi satwa (wildlife overpass) yang tertutup pepohonan rimbun di atas jalan tol untuk menghubungkan kembali koridor jelajah primata",
          "Memasang pagar kawat berduri setinggi 5 meter di sepanjang jalan tol",
          "Membasmi seluruh populasi primata agar tidak mengganggu lalu lintas jalan tol",
          "Mempercepat kelajuan kendaraan agar satwa takut mendekat"
        ],
        kunci: [0],
        pembahasan: "Wildlife overpass atau jembatan satwa adalah intervensi mitigasi keruangan standar internasional yang menghubungkan kembali kanopi hutan yang terputus, memungkinkan perpindahan genetik alami antarsubpopulasi satwa."
      }
    ]
  }
];

fs.writeFileSync(path.join(KELAS_XI_DIR, '01-02.json'), JSON.stringify(babs01_02, null, 2), 'utf-8');
console.log('Successfully updated kelas-xi/01-02.json (Semester 1)!');

// ===== 03-04.json (Semester 1) =====
const babs03_04 = [
  {
    id: "xi-03",
    kelas: "XI",
    urutan: 3,
    semester: 1,
    youtube_id: "9L9s3J-4L-A",
    fase: "F",
    elemen: "Pemahaman Konsep Pengelolaan Sumber Daya Alam",
    judul: "Sebaran dan Pengelolaan Sumber Daya Alam Berkelanjutan",
    ringkasan: "Memaksimalkan berkah alam: klasifikasi SDA, sebaran mineral tambang strategis, kebijakan hilirisasi nikel Morowali & Weda Bay, AMDAL lingkungan, serta restorasi lahan pascatambang berstandar ESG 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu mengklasifikasikan sumber daya alam, menganalisis sebaran dan pemanfaatan SDA berkelanjutan, mengevaluasi kebijakan hilirisasi tambang mineral dan dampaknya terhadap sosio-ekologis, serta menerapkan AMDAL.",
    tujuan: [
      "Mengklasifikasikan sumber daya alam materi, energi, ruang, dan waktu (terbarukan vs tak terbarukan).",
      "Menganalisis sebaran potensi tambang strategis Indonesia (nikel, tembaga, bauksit, batubara, emas).",
      "Mengevaluasi kebijakan hilirisasi nikel di Morowali (IMIP) dan Halmahera Tengah (IWIP) dari kacamata ekonomi dan ekologi.",
      "Menelaah instrumen pengelolaan lingkungan hidup: AMDAL, UKL-UPL, dan baku mutu lingkungan.",
      "Merumuskan konsep pengelolaan sumber daya berbasis ekonomi sirkular dan Environmental, Social, and Governance (ESG)."
    ],
    materi: [
      {
        id: "xi03-t1",
        judul: "Topik 1: Sebaran Mineral Tambang & Hilirisasi Nikel Hijau 2026",
        youtube_id: "9L9s3J-4L-A",
        kuis_topik: {
          pertanyaan: "Kebijakan pemerintah melarang ekspor bijih nikel mentah (raw ore) dan mewajibkan pembangunan fasilitas pemurnian (smelter) di dalam negeri bertujuan utama untuk ...",
          opsi: [
            "Menghabiskan seluruh cadangan nikel dalam waktu 1 tahun",
            "Meningkatkan nilai tambah ekonomi komoditas nasional berkali-kali lipat, menyerap tenaga kerja lokal, dan menguasai rantai pasok baterai kendaraan listrik global",
            "Menghentikan seluruh aktivitas pertambangan di Indonesia",
            "Mengganti seluruh mineral nikel dengan batu bara"
          ],
          kunci: 1,
          pembahasan: "Hilirisasi (downstreaming) mentransformasikan ekspor komoditas mentah bernilai murah menjadi produk bernilai tambah tinggi (seperti Ferronickel, Mixed Hydroxide Precipitate / MHP, hingga prekursor katoda baterai EV), sehingga penerimaan negara melonjak tajam dan membuka lapangan kerja industri manufaktur modern."
        },
        html: `<div class="bl-callout case">
<h4>⚡ Dilema Geografis 2026: Hilirisasi Nikel Antara Lonjakan Devisa dan Beban Ekologis</h4>
<p>Indonesia merupakan pemegang cadangan nikel terbesar di dunia (sekitar 21 juta metrik ton atau ±22% cadangan global). Kawasan industri pengolahan nikel raksasa seperti di Morowali (Sulawesi Tengah), Konawe (Sulawesi Tenggara), dan Weda Bay (Maluku Utara) berhasil mengubah Indonesia menjadi raksasa pemasok material baterai kendaraan listrik (EV) dunia.</p>
<p>Namun, geografi menuntut kita berpikir holistik: smelter HPAL (High Pressure Acid Leach) membutuhkan pasokan energi listrik masif dari PLTU batubara mandiri, menghasilkan limbah tailing asam, dan mengancam ekosistem perairan terumbu karang pesisir jika tidak dikelola ketat. Solusi masa kini menuntut transisi ke <strong>Nikel Hijau (Green Nickel)</strong> yang ditenagai pembangkit energi baru terbarukan (PLTS dan PLTA).</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Pengelolaan Sumber Daya Alam dan Hilirisasi Mineral Berkelanjutan
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/9L9s3J-4L-A?rel=0" title="Video Pembelajaran: Hilirisasi SDA" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Pelajari peta sebaran mineral, rantai pasok nikel, dan pemulihan lingkungan pascatambang.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Hilirisasi", arti: "Strategi peningkatan nilai tambah komoditas dengan mengolah bahan mentah menjadi barang setengah jadi atau jadi di dalam negeri." },
      { istilah: "AMDAL", arti: "Kajian mengenai dampak penting suatu usaha dan/atau kegiatan yang direncanakan pada lingkungan hidup." },
      { istilah: "Reklamasi", arti: "Kegiatan yang dilakukan sepanjang tahapan usaha pertambangan untuk menata, memulihkan, dan memperbaiki kualitas lingkungan." },
      { istilah: "Ekonomi Sirkular", arti: "Model ekonomi yang memaksimalkan umur pakai material dan meminimalkan timbulan limbah buangan." }
    ],
    soal: [
      {
        id: "xi-03-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Mengevaluasi trade-off ekonomi dan lingkungan pada hilirisasi tambang",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Laporan Dampak Lingkungan Kawasan Smelter Nikel",
          isi: "<p>Kawasan industri smelter nikel mencatat ekspor 50 triliun rupiah per tahun. Namun, nelayan setempat mengeluhkan kekeruhan air laut akibat pembuangan air bahang pendingin dan sedimentasi tanah laterit.</p>",
          sumber: "Laporan Evaluasi Lingkungan Hidup Daerah"
        },
        pertanyaan: "Kebijakan integratif apa yang paling tepat diterapkan agar pertumbuhan industri smelter tidak mematikan mata pencaharian nelayan pesisir?",
        opsi: [
          "Mewajibkan industri membangun instalasi pendingin tertutup (closed-loop system), kolam pengendap sedimen bertingkat, serta memberlakukan baku mutu air limbah yang diawasi sensor IoT online",
          "Menggusur seluruh perkampungan nelayan ke pulau terluar tanpa kompensasi",
          "Menutup seluruh smelter nikel dan kembali mengekspor bijih mentah",
          "Mengizinkan nelayan beralih profesi tanpa pelatihan keahlian kerja"
        ],
        kunci: [0],
        pembahasan: "Pembangunan berkelanjutan mensyaratkan kepatuhan teknologi lingkungan (closed-loop water cooling dan settling pond sedimen terpadu) serta pemantauan telemetri real-time agar ekosistem laut tetap lestari berdampingan dengan industri hilir."
      }
    ]
  },
  {
    id: "xi-04",
    kelas: "XI",
    urutan: 4,
    semester: 1,
    youtube_id: "Z7G2F6-zQ8c",
    fase: "F",
    elemen: "Pemahaman Konsep Ketahanan Pangan, Industri, dan EBT",
    judul: "Ketahanan Pangan, Industri, dan Energi Baru Terbarukan (EBT)",
    ringkasan: "Memperkuat pilar kedaulatan bangsa: potensi pangan lokal Nusantara, program Food Estate berkelanjutan, sebaran kawasan industri nasional, serta akselerasi transisi energi hijau (PLTS Terapung Cirata & Geothermal Kamojang/Dieng) 2026.",
    estimasi: "8 JP",
    cp: "Peserta didik mampu menganalisis potensi dan persebaran sumber daya untuk ketahanan pangan, bahan baku industri, serta energi baru dan terbarukan (EBT) guna mendukung pembangunan nasional berketahanan iklim.",
    tujuan: [
      "Menganalisis 4 pilar ketahanan pangan: ketersediaan, keterjangkauan, pemanfaatan nutrisi, dan stabilitas pasokan.",
      "Mengevaluasi potensi keanekaragaman pangan lokal (sagu Papua, sorgum NTT, jagung Madura, umbi-umbian) mengurangi ketergantungan gandum impor.",
      "Menganalisis persebaran kawasan industri strategis nasional (Kawasan Industri Terpadu Batang, Sei Mangkei, Morowali).",
      "Memetakan potensi energi baru terbarukan Indonesia: tenaga surya PLTS terapung, panas bumi geothermal, mikrohidro, dan biomassa.",
      "Merumuskan strategi transisi energi berkeadilan (Just Energy Transition Partnership / JETP)."
    ],
    materi: [
      {
        id: "xi04-t1",
        judul: "Topik 1: Ketahanan Pangan & Transisi EBT (PLTS Cirata) 2026",
        youtube_id: "Z7G2F6-zQ8c",
        kuis_topik: {
          pertanyaan: "PLTS Terapung Cirata di Jawa Barat (kapasitas 192 MWp) merupakan salah satu PLTS terapung terbesar di Asia Tenggara. Keunggulan teknis dan geografis memasang panel surya di atas permukaan waduk air adalah ...",
          opsi: [
            "Panel surya dapat berenang mengikuti arah angin",
            "Menghemat penggunaan lahan daratan yang berharga, mengurangi penguapan air waduk (evaporasi), dan efek pendinginan air waduk meningkatkan efisiensi daya listrik panel surya",
            "Menaikkan suhu air waduk hingga mendidih untuk menggerakkan turbin uap",
            "Hanya bisa bekerja saat musim hujan lebat"
          ],
          kunci: 1,
          pembahasan: "Floating Solar PV memanfaatkan ruang permukaan air bendungan sehingga tidak memakan lahan pertanian/hutan produktif di darat. Efek pendinginan alami oleh air waduk di bawah panel surya mampu menaikkan efisiensi sel photovoltaic hingga 5–10% dibanding pemasangan di atas atap panas."
        },
        html: `<div class="bl-callout case">
<h4>⚡ Terobosan Energi Bersih 2026: PLTS Terapung Cirata & Panas Bumi Kamojang</h4>
<p>Dalam komitmen mencapai <em>Net Zero Emissions (NZE)</em> tahun 2060 atau lebih cepat, Indonesia memiliki potensi energi terbarukan raksasa mencapai lebih dari 3.600 GigaWatt (GW) yang bersumber dari sinar matahari, panas bumi (geothermal), tenaga angin, dan air.</p>
<p>Proyek monumental <strong>PLTS Terapung Cirata (192 MWp)</strong> di waduk Kabupaten Purwakarta dan Cianjur membuktikan sinergi cerdas pemanfaatan ruang waduk air. Dipadukan dengan potensi 24 GW panas bumi di sepanjang jalur gunung api (seperti PLTP Kamojang, Salak, dan Dieng), Indonesia siap memimpin transisi energi bersih di Asia Tenggara.</p>
</div>

<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0">
  <div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="red"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12c0 2 .2 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8 0-2-.2-3.9-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4" fill="#fff"/></svg>
    Video Pembelajaran: Ketahanan Pangan Nasional dan Energi Baru Terbarukan (EBT)
  </div>
  <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">
    <iframe src="https://www.youtube.com/embed/Z7G2F6-zQ8c?rel=0" title="Video Pembelajaran: Ketahanan Pangan & EBT" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe>
  </div>
  <div style="background:#f8fafc;padding:8px 12px;font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0">
    Eksplorasi pilar kedaulatan pangan, kawasan industri, dan teknologi pembangkit energi hijau.
  </div>
</div>`
      }
    ],
    glosarium: [
      { istilah: "Ketahanan Pangan", arti: "Kondisi terpenuhinya pangan bagi negara sampai perseorangan yang tercermin dari tersedianya pangan yang cukup, aman, bergizi, dan merata." },
      { istilah: "EBT", arti: "Energi Baru Terbarukan yang bersumber dari alam dan dapat pulih secara berkelanjutan (surya, angin, air, panas bumi)." },
      { istilah: "Geothermal", arti: "Energi panas bumi yang dihasilkan dari uap panas batuan kerak bumi di kawasan vulkanik aktif." },
      { istilah: "Food Estate", arti: "Program terintegrasi pengembangan pangan skala luas yang mencakup pertanian, perkebunan, dan peternakan." }
    ],
    soal: [
      {
        id: "xi-04-q1",
        tipe: "pgm",
        level: "C4",
        literasi: "Menganalisis diversifikasi pangan lokal mengurangi kerentanan impor",
        numerasi: "Tidak dominan",
        stimulus: {
          jenis: "teks",
          judul: "Kerentanan Rantai Pasok Pangan Global",
          isi: "<p>Krisis geopolitik dan perubahan iklim menyebabkan harga gandum dan beras dunia berfluktuasi tajam. Daerah semi-kering di Nusa Tenggara Timur mulai membudidayakan sorgum yang tahan kering dan minim air sebagai pengganti beras dan gandum impor.</p>",
          sumber: "Badan Pangan Nasional (Bapanas)"
        },
        pertanyaan: "Mengapa diversifikasi tanaman pangan lokal seperti sorgum dan sagu sangat strategis dalam memperkuat ketahanan pangan nasional?",
        opsi: [
          "Karena sorgum dan sagu memiliki ketahanan tinggi terhadap iklim kering lokal, kaya serat gizi, serta melepaskan ketergantungan konsumsi dari komoditas impor gandum",
          "Karena tanaman sorgum tidak membutuhkan tanah untuk tumbuh",
          "Karena harga sorgum di pasar dunia selalu nol rupiah",
          "Karena masyarakat Indonesia dilarang mengonsumsi nasi"
        ],
        kunci: [0],
        pembahasan: "Diversifikasi pangan berbasis potensi biofisik daerah memperkuat ketahanan pangan: sorgum berakar dalam dan tahan kekeringan di NTT, sagu tumbuh melimpah di lahan basah Maluku dan Papua. Ini menciptakan kedaulatan pangan tangguh tanpa rentan gejolak impor."
      }
    ]
  }
];

fs.writeFileSync(path.join(KELAS_XI_DIR, '03-04.json'), JSON.stringify(babs03_04, null, 2), 'utf-8');
console.log('Successfully updated kelas-xi/03-04.json (Semester 1)!');
