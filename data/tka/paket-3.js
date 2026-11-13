// Paket 3 TKA Geografi Kelas X - sepuluh pendekatan geografi dan metode kajiannya.
module.exports = {
  bab: {
    id: 'x-11',
    kelas: 'X',
    urutan: 11,
    fase: 'E',
    elemen: 'Pemahaman Konsep dan Keterampilan Proses Geografi',
    judul: 'TKA Geografi 3: Sepuluh Pendekatan dan Metode Kajian Geografi',
    ringkasan: 'Paket soal TKA HOTS tentang tiga pendekatan utama geografi, tujuh pendekatan pendukung, serta pemilihan metode pengumpulan dan analisis data pada kasus pesisir, kebencanaan, dan kualitas lingkungan.',
    estimasi: '3 JP',
    semester: 2,
    bebas_akses: true,
    cp: 'Peserta didik mampu memilih dan menerapkan pendekatan serta metode geografi yang tepat untuk menjawab pertanyaan keruangan atas fenomena aktual.',
    tujuan: [
      'Membedakan pendekatan keruangan, kelingkungan, dan kompleks wilayah.',
      'Mengenali tujuh pendekatan pendukung beserta kegunaannya.',
      'Memilih metode pengumpulan dan analisis data yang sesuai pertanyaan penelitian.',
      'Mengevaluasi rancangan kajian geografi atas kasus kebencanaan dan lingkungan.'
    ],
    materi: [
      {
        id: 't1',
        judul: 'Ringkasan: Tiga Pendekatan Utama dan Tujuh Pendukung',
        html: '<p>Tiga pendekatan utama geografi: keruangan (spasial), kelingkungan (ekologis), dan kompleks wilayah (regional). Tujuh pendekatan pendukung yang sering dipakai: historis, deskriptif, kuantitatif, kualitatif, kausal, korologis, dan sistem. Pemilihan pendekatan bergantung pada pertanyaan penelitian, bukan pada selera peneliti.</p>'
      }
    ],
    glosarium: [
      { istilah: 'pendekatan keruangan', arti: 'cara mengkaji fenomena melalui lokasi, sebaran, pola, dan interaksi dalam ruang.' },
      { istilah: 'pendekatan kelingkungan', arti: 'cara mengkaji hubungan timbal balik manusia dengan lingkungan fisiknya.' },
      { istilah: 'pendekatan kompleks wilayah', arti: 'cara mengkaji suatu wilayah sebagai kesatuan berbagai unsur yang saling terkait.' },
      { istilah: 'pendekatan sistem', arti: 'cara memandang fenomena sebagai rangkaian masukan, proses, keluaran, dan umpan balik.' },
      { istilah: 'pendekatan kausal', arti: 'cara menjelaskan fenomena dengan mencari sebab dan akibatnya.' },
      { istilah: 'pendekatan korologis', arti: 'cara memadukan berbagai pendekatan dalam satu kesatuan wilayah kajian.' }
    ]
  },
  klaster: [
    {
      stimulus: {
        jenis: 'video',
        judul: 'Video Pemantik: Tiga Pendekatan Utama dalam Geografi',
        youtube_id: '3R0lmZMhCsA',
        isi: '<p>Video ini menjelaskan pendekatan keruangan, kelingkungan, dan kompleks wilayah. Ketiganya bukan pilihan yang saling meniadakan: satu kasus dapat dianalisis dengan lebih dari satu pendekatan, tergantung pertanyaan yang ingin dijawab. Perhatikan contoh yang diberikan, lalu hubungkan dengan kasus banjir rob Semarang pada stimulus berikutnya.</p><p>Bedakan dengan cermat: pertanyaan lokasi dan sebaran menuntun pada pendekatan keruangan, pertanyaan relasi manusia-lingkungan menuntun pada pendekatan kelingkungan, sedangkan pertanyaan tentang kesatuan wilayah menuntun pada pendekatan kompleks wilayah.</p>',
        sumber: 'YouTube - Belajar Geo bareng Bu Laras: Sampai Paham! Pendekatan dalam Geografi'
      },
      soal: [
        {
          tipe: 'pg_singkat',
          level: 'C4',
          literasi: 'Membedakan tiga pendekatan utama',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Pertanyaan "mengapa genangan rob lebih luas di kecamatan pesisir dibanding kecamatan pedalaman kota" paling tepat dijawab dengan pendekatan ...',
          opsi: [
            'Pendekatan keruangan karena menekankan perbedaan lokasi, jarak, dan pola sebaran genangan.',
            'Pendekatan historis karena menekankan urutan waktu kejadian banjir.',
            'Pendekatan kualitatif karena menekankan wawancara mendalam dengan warga.',
            'Pendekatan deskriptif karena cukup mendaftar nama kecamatan yang tergenang.',
            'Pendekatan kausal karena cukup menyebutkan bahwa banjir disebabkan hujan.'
          ],
          kunci: [0],
          pembahasan: 'Pertanyaan tentang mengapa dampak berbeda menurut lokasi menuntut analisis sebaran dan pola keruangan, inti pendekatan keruangan.'
        },
        {
          tipe: 'pgm',
          level: 'C4',
          literasi: 'Menguji kesesuaian pendekatan dengan fokus kajian',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Perhatikan pernyataan berikut. (1) Pendekatan kelingkungan mengkaji hubungan timbal balik manusia dan lingkungan; (2) Pendekatan kompleks wilayah memandang wilayah sebagai kesatuan unsur yang saling terkait; (3) Pendekatan keruangan menekankan lokasi, sebaran, dan interaksi; (4) Ketiga pendekatan tidak dapat dipakai bersama dalam satu kajian. Pernyataan yang tepat adalah ...',
          opsi: [
            '(1), (2), dan (3) saja',
            '(1) dan (4) saja',
            '(2) dan (4) saja',
            '(3) dan (4) saja',
            'Semua pernyataan benar'
          ],
          kunci: [0],
          pembahasan: 'Ketiga pendekatan justru sering dipadukan. Pernyataan (4) bertentangan dengan praktik kajian geografi.'
        },
        {
          tipe: 'pg_kompleks',
          level: 'C5',
          literasi: 'Menganalisis kasus dengan pendekatan kelingkungan',
          numerasi: 'Menghubungkan penurunan tanah dengan genangan',
          pertanyaan: 'Pilih semua pernyataan yang menunjukkan penggunaan pendekatan kelingkungan pada kasus rob Semarang.',
          opsi: [
            'Menganalisis hubungan antara pengambilan air tanah dan penurunan muka tanah.',
            'Menilai pengaruh hilangnya mangrove terhadap tinggi gelombang di pesisir.',
            'Menghitung jumlah rumah yang tergenang tanpa melihat proses lingkungan.',
            'Mengkaji hubungan antara perluasan lahan terbangun dan daya serap tanah.',
            'Menghitung luas genangan tanpa menghubungkannya dengan proses lingkungan.'
          ],
          kunci: [0, 1, 3],
          pembahasan: 'Pendekatan kelingkungan menekankan relasi manusia-lingkungan. Sekadar menghitung rumah tergenang bersifat deskriptif.'
        },
        {
          tipe: 'menjodohkan',
          level: 'C4',
          literasi: 'Memasangkan pendekatan dengan pertanyaan khas',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Jodohkan pendekatan pada kolom kiri dengan pertanyaan khas pada kolom kanan.',
          kiri: ['Keruangan', 'Kelingkungan', 'Kompleks wilayah', 'Historis', 'Kausal'],
          kanan: [
            'Bagaimana wilayah pesisir bekerja sebagai satu kesatuan fisik, sosial, dan kelembagaan',
            'Di mana genangan terjadi dan bagaimana polanya',
            'Mengapa penurunan muka tanah memperparah genangan',
            'Bagaimana hubungan pengambilan air tanah dengan penurunan muka tanah',
            'Bagaimana perkembangan genangan dari masa kolonial hingga kini'
          ],
          kunci: [1, 3, 0, 4, 2],
          pembahasan: 'Keruangan (B), kelingkungan (D), kompleks wilayah (A), historis (E), dan kausal (C).'
        },
        {
          tipe: 'benar_salah',
          level: 'C4',
          literasi: 'Menilai pernyataan tentang pendekatan',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Tentukan Benar (B) atau Salah (S) untuk setiap pernyataan berikut.',
          pernyataan: [
            'Pendekatan keruangan menekankan lokasi, sebaran, pola, dan interaksi antartempat.',
            'Pendekatan kelingkungan hanya membahas kondisi fisik tanpa melibatkan manusia.',
            'Pendekatan kompleks wilayah memandang wilayah sebagai kesatuan berbagai unsur yang saling terkait.',
            'Satu kasus geografi hanya boleh dianalisis dengan satu pendekatan.'
          ],
          kunci: ['B', 'S', 'B', 'S'],
          pembahasan: 'Pendekatan kelingkungan justru menekankan relasi manusia-lingkungan, dan satu kasus dapat dianalisis dengan beberapa pendekatan.'
        },
        {
          tipe: 'pg_singkat',
          level: 'C5',
          literasi: 'Menilai kesesuaian pendekatan dengan tujuan kajian',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Pemerintah kota ingin menyusun rencana tata ruang pesisir yang memperhitungkan fisik, sosial, dan kelembagaan. Pendekatan yang paling sesuai adalah ...',
          opsi: [
            'Pendekatan deskriptif karena cukup mendaftar kondisi setiap kelurahan.',
            'Pendekatan kompleks wilayah karena memandang wilayah sebagai kesatuan unsur yang saling terkait.',
            'Pendekatan historis karena hanya membutuhkan dokumen masa lalu.',
            'Pendekatan kuantitatif karena semua persoalan dapat diukur dengan angka.',
            'Pendekatan kausal karena cukup mengetahui satu sebab banjir.'
          ],
          kunci: [1],
          pembahasan: 'Perencanaan tata ruang menuntut pemahaman wilayah sebagai sistem yang memadukan unsur fisik, sosial, dan kelembagaan, sesuai pendekatan kompleks wilayah.'
        }
      ]
    },
    {
      stimulus: {
        jenis: 'tabel',
        judul: 'Sepuluh Pendekatan Geografi dan Kegunaannya',
        isi: '<table><thead><tr><th>Pendekatan</th><th>Pertanyaan pokok</th><th>Contoh penerapan</th></tr></thead><tbody><tr><td>Keruangan</td><td>Di mana, seberapa luas, bagaimana pola</td><td>Peta sebaran genangan rob</td></tr><tr><td>Kelingkungan</td><td>Bagaimana relasi manusia-lingkungan</td><td>Pengaruh alih fungsi lahan terhadap limpasan</td></tr><tr><td>Kompleks wilayah</td><td>Bagaimana unsur wilayah saling terkait</td><td>Rencana tata ruang pesisir terpadu</td></tr><tr><td>Historis</td><td>Bagaimana perubahan dari waktu ke waktu</td><td>Riwayat perluasan permukiman pesisir</td></tr><tr><td>Deskriptif</td><td>Bagaimana ciri fenomena dijelaskan</td><td>Uraian kondisi saluran drainase</td></tr><tr><td>Kuantitatif</td><td>Berapa besar hubungan antarvariabel</td><td>Korelasi kepadatan bangunan dan kedalaman genangan</td></tr><tr><td>Kualitatif</td><td>Bagaimana makna dan pengalaman pelaku</td><td>Wawancara warga tentang adaptasi rob</td></tr><tr><td>Kausal</td><td>Mengapa fenomena terjadi</td><td>Analisis sebab penurunan muka tanah</td></tr><tr><td>Korologis</td><td>Bagaimana semua unsur dipadukan</td><td>Kajian wilayah pesisir secara menyeluruh</td></tr><tr><td>Sistem</td><td>Bagaimana masukan, proses, dan keluaran bekerja</td><td>Model drainase kota dan pompa</td></tr></tbody></table>',
        sumber: 'Sintesis pendekatan geografi'
      },
      soal: [
        {
          tipe: 'pg_singkat',
          level: 'C4',
          literasi: 'Menentukan pendekatan yang sesuai',
          numerasi: 'Menafsirkan korelasi antarvariabel',
          pertanyaan: 'Peneliti menguji hubungan antara kepadatan bangunan dan kedalaman genangan menggunakan uji statistik. Pendekatan yang digunakan adalah ...',
          opsi: [
            'Pendekatan kuantitatif karena menggunakan angka dan uji hubungan antarvariabel.',
            'Pendekatan kualitatif karena menekankan pengalaman warga.',
            'Pendekatan historis karena menelusuri dokumen masa lalu.',
            'Pendekatan deskriptif karena hanya menyebutkan nama lokasi.',
            'Pendekatan korologis karena meniadakan analisis statistik.'
          ],
          kunci: [0],
          pembahasan: 'Penggunaan angka dan uji statistik untuk mengukur hubungan antarvariabel merupakan ciri pendekatan kuantitatif.'
        },
        {
          tipe: 'pgm',
          level: 'C5',
          literasi: 'Menguji kesesuaian pendekatan dengan data',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Perhatikan pernyataan berikut. (1) Wawancara mendalam tentang adaptasi warga merupakan data kualitatif; (2) Peta sebaran genangan merupakan keluaran pendekatan keruangan; (3) Model drainase dengan masukan curah hujan dan keluaran debit merupakan pendekatan sistem; (4) Pendekatan kausal cukup mendaftar gejala tanpa menjelaskan sebab. Pernyataan yang tepat adalah ...',
          opsi: [
            '(1), (2), dan (3) saja',
            '(1) dan (4) saja',
            '(2) dan (4) saja',
            '(3) dan (4) saja',
            'Semua pernyataan benar'
          ],
          kunci: [0],
          pembahasan: 'Pendekatan kausal justru menuntut penjelasan sebab-akibat, bukan sekadar pendaftaran gejala.'
        },
        {
          tipe: 'pg_kompleks',
          level: 'C5',
          literasi: 'Mengevaluasi kombinasi pendekatan',
          numerasi: 'Menimbang kebutuhan data',
          pertanyaan: 'Pilih semua pernyataan yang tepat mengenai penggunaan pendekatan pada studi banjir pesisir.',
          opsi: [
            'Pendekatan historis membantu menjelaskan perubahan luas genangan dari waktu ke waktu.',
            'Pendekatan kuantitatif dan kualitatif dapat dipadukan untuk melengkapi analisis.',
            'Pendekatan sistem membantu membaca hubungan antara curah hujan, drainase, dan pompa.',
            'Pendekatan deskriptif sudah cukup untuk merumuskan kebijakan mitigasi yang menyeluruh.',
            'Pendekatan kualitatif tidak dapat dipakai untuk mengkaji pengalaman warga.'
          ],
          kunci: [0, 1, 2],
          pembahasan: 'Kebijakan mitigasi menyeluruh membutuhkan analisis hubungan dan sistem, bukan sekadar uraian deskriptif.'
        },
        {
          tipe: 'menjodohkan',
          level: 'C4',
          literasi: 'Memasangkan pendekatan dengan data yang digunakan',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Jodohkan pendekatan pada kolom kiri dengan jenis data yang paling sesuai pada kolom kanan.',
          kiri: ['Kuantitatif', 'Kualitatif', 'Historis', 'Sistem', 'Keruangan'],
          kanan: [
            'Peta sebaran dan pola keruangan',
            'Model masukan-proses-keluaran',
            'Angka pengukuran dan uji statistik',
            'Dokumen lama, arsip, dan citra waktu lampau',
            'Transkrip wawancara dan catatan lapangan'
          ],
          kunci: [2, 4, 3, 1, 0],
          pembahasan: 'Kuantitatif (C), kualitatif (E), historis (D), sistem (B), dan keruangan (A).'
        },
        {
          tipe: 'benar_salah',
          level: 'C4',
          literasi: 'Menilai pernyataan pendekatan',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Tentukan Benar (B) atau Salah (S) untuk setiap pernyataan berikut.',
          pernyataan: [
            'Pendekatan korologis memadukan berbagai unsur dalam satu kesatuan wilayah kajian.',
            'Pendekatan sistem hanya memandang fenomena sebagai daftar objek tanpa proses.',
            'Pendekatan kualitatif dapat digunakan untuk memahami alasan warga bertahan di kawasan rawan rob.',
            'Pendekatan kuantitatif tidak memerlukan data angka dalam penerapannya.'
          ],
          kunci: ['B', 'S', 'B', 'S'],
          pembahasan: 'Pendekatan sistem menekankan proses dan umpan balik, sedangkan pendekatan kuantitatif justru bertumpu pada data angka.'
        },
        {
          tipe: 'pg_kompleks',
          level: 'C6',
          literasi: 'Mengevaluasi kesesuaian pendekatan dengan tujuan',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Pilih semua pernyataan yang tepat tentang pemilihan pendekatan dalam penelitian geografi.',
          opsi: [
            'Pendekatan dipilih berdasarkan pertanyaan penelitian yang diajukan.',
            'Kombinasi pendekatan dapat menghasilkan analisis yang lebih utuh.',
            'Pendekatan kuantitatif selalu lebih baik daripada pendekatan kualitatif.',
            'Ketersediaan data perlu dipertimbangkan sebelum menetapkan pendekatan.',
            'Pendekatan historis tidak relevan untuk kajian perubahan penggunaan lahan.'
          ],
          kunci: [0, 1, 3],
          pembahasan: 'Tidak ada pendekatan yang selalu lebih baik; kesesuaian dengan pertanyaan dan ketersediaan data menjadi penentu.'
        }
      ]
    },
    {
      stimulus: {
        jenis: 'teks',
        judul: 'Metode Pengumpulan Data dalam Kajian Geografi Lapangan',
        isi: '<p>Kajian geografi memerlukan data yang sesuai dengan pertanyaan. Observasi lapangan dipakai untuk mencatat kondisi nyata, seperti tinggi genangan dan kondisi saluran. Wawancara menggali pengalaman dan alasan tindakan warga. Kuesioner mengumpulkan data dari banyak responden secara seragam. Studi dokumenter menelusuri arsip, peta lama, dan laporan. Pengukuran dan pemetaan menghasilkan data posisi serta dimensi. Analisis laboratorium dipakai untuk menguji kualitas air atau tanah.</p><p>Setiap metode memiliki keterbatasan. Observasi tidak menangkap alasan orang bertindak, wawancara terbatas jumlahnya, dan kuesioner bergantung pada kejujuran responden. Karena itu triangulasi, yaitu penggunaan beberapa metode sekaligus, meningkatkan keandalan simpulan.</p>',
        sumber: 'Sintesis metode penelitian geografi'
      },
      soal: [
        {
          tipe: 'pg_singkat',
          level: 'C4',
          literasi: 'Memilih metode yang sesuai',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Peneliti ingin mengetahui alasan warga tetap bertahan di kawasan yang rutin tergenang rob. Metode yang paling tepat adalah ...',
          opsi: [
            'Wawancara mendalam untuk menggali alasan, pengalaman, dan strategi adaptasi warga.',
            'Pengukuran kedalaman genangan untuk menghitung luas area terdampak.',
            'Analisis laboratorium untuk menguji kadar garam air tanah.',
            'Pemetaan penggunaan lahan untuk menghitung luas permukiman.',
            'Studi dokumenter untuk menelusuri arsip pajak bangunan.'
          ],
          kunci: [0],
          pembahasan: 'Pertanyaan tentang alasan dan pengalaman menuntut data kualitatif, sehingga wawancara mendalam paling sesuai.'
        },
        {
          tipe: 'pgm',
          level: 'C5',
          literasi: 'Menguji kesesuaian metode dan keterbatasannya',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Perhatikan pernyataan berikut. (1) Observasi lapangan mencatat kondisi nyata tetapi lemah dalam menangkap alasan tindakan; (2) Wawancara menggali pengalaman tetapi terbatas jumlah respondennya; (3) Kuesioner menjangkau banyak responden tetapi bergantung pada kejujuran jawaban; (4) Triangulasi justru menurunkan keandalan simpulan karena mencampur metode. Pernyataan yang tepat adalah ...',
          opsi: [
            '(1), (2), dan (3) saja',
            '(1) dan (4) saja',
            '(2) dan (4) saja',
            '(3) dan (4) saja',
            'Semua pernyataan benar'
          ],
          kunci: [0],
          pembahasan: 'Triangulasi meningkatkan keandalan karena saling memeriksa antarmetode, sehingga pernyataan (4) salah.'
        },
        {
          tipe: 'pg_kompleks',
          level: 'C5',
          literasi: 'Merancang kombinasi metode',
          numerasi: 'Menimbang kebutuhan data kuantitatif dan kualitatif',
          pertanyaan: 'Pilih semua pernyataan yang menunjukkan penggunaan triangulasi metode secara tepat.',
          opsi: [
            'Menggabungkan pengukuran genangan dengan wawancara warga untuk memeriksa kesesuaian data.',
            'Membandingkan hasil kuesioner dengan observasi lapangan pada beberapa titik.',
            'Menggunakan satu metode saja agar hasil dianggap paling valid.',
            'Menelusuri dokumen lama untuk memeriksa klaim warga tentang riwayat genangan.',
            'Mengandalkan satu metode saja agar seluruh temuan dianggap seragam.'
          ],
          kunci: [0, 1, 3],
          pembahasan: 'Triangulasi memadukan beberapa metode untuk saling memeriksa, bukan justru membatasi pada satu metode.'
        },
        {
          tipe: 'menjodohkan',
          level: 'C4',
          literasi: 'Memasangkan metode dengan data yang dihasilkan',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Jodohkan metode pada kolom kiri dengan data yang paling tepat dihasilkan pada kolom kanan.',
          kiri: ['Wawancara mendalam', 'Kuesioner', 'Studi dokumenter', 'Pengukuran lapangan', 'Analisis laboratorium'],
          kanan: [
            'Catatan pengalaman dan alasan tindakan warga',
            'Angka tinggi genangan dan lebar saluran',
            'Kadar pencemar pada sampel air',
            'Peta lama dan laporan terdahulu',
            'Jawaban seragam dari banyak responden'
          ],
          kunci: [0, 4, 3, 1, 2],
          pembahasan: 'Wawancara menghasilkan catatan pengalaman (A), kuesioner menghasilkan jawaban seragam (E), studi dokumenter menghasilkan peta dan laporan lama (D), pengukuran lapangan menghasilkan angka dimensi fisik (B), dan analisis laboratorium menghasilkan kadar pencemar (C).'
        },
        {
          tipe: 'benar_salah',
          level: 'C4',
          literasi: 'Menilai pernyataan metode',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Tentukan Benar (B) atau Salah (S) untuk setiap pernyataan berikut.',
          pernyataan: [
            'Wawancara mendalam cocok untuk menggali alasan dan pengalaman pelaku.',
            'Kuesioner paling tepat digunakan untuk memperoleh data mendalam dari lima responden.',
            'Triangulasi metode dapat meningkatkan keandalan simpulan penelitian.',
            'Observasi lapangan selalu mampu menjelaskan sebab tindakan manusia.'
          ],
          kunci: ['B', 'S', 'B', 'S'],
          pembahasan: 'Kuesioner dirancang untuk banyak responden, dan observasi tidak menjelaskan motif tindakan tanpa data wawancara.'
        },
        {
          tipe: 'pgm',
          level: 'C6',
          literasi: 'Mengevaluasi rancangan penelitian',
          numerasi: 'Menimbang kebutuhan pengukuran berulang',
          pertanyaan: 'Perhatikan pernyataan berikut tentang rancangan penelitian yang menghubungkan kondisi saluran drainase dengan kedalaman genangan. (1) Pengukuran perlu dilakukan pada banyak titik agar simpulan tidak bertumpu pada satu pengamatan; (2) Wawancara warga dapat melengkapi data pengukuran untuk menjelaskan sebab genangan; (3) Data dari media sosial dapat dipakai tanpa memeriksa metode pengambilannya; (4) Peta lama sebaiknya diperbarui dengan kondisi lapangan terkini. Rancangan yang dapat dipertanggungjawabkan adalah ...',
          opsi: [
            '(1), (2), dan (4) saja',
            '(1) dan (3) saja',
            '(2) dan (3) saja',
            '(3) dan (4) saja',
            'Semua pernyataan benar'
          ],
          kunci: [0],
          pembahasan: 'Pengukuran berulang, pelengkap wawancara, dan pembaruan peta menunjukkan rancangan yang kuat. Data media sosial tanpa verifikasi metode tidak dapat dipertanggungjawabkan.'
        }
      ]
    },
    {
      stimulus: {
        jenis: 'teks',
        judul: 'Pendekatan Sistem dan Peran SIG dalam Kesiapsiagaan Bencana',
        isi: '<p>Menghadapi erupsi gunung api, kesiapsiagaan dapat dibaca sebagai sistem: masukan berupa data kegempaan, deformasi, dan cuaca; proses berupa analisis bahaya dan kerentanan; keluaran berupa peta kawasan rawan bencana serta rencana evakuasi; umpan balik berupa laporan lapangan yang memperbarui model.</p><p>Sistem informasi geografis memadukan data posisi, jaringan jalan, sebaran penduduk, dan zona bahaya. Hasilnya membantu menentukan jalur evakuasi, lokasi pengungsian, dan prioritas penyuluhan. Namun peta hanya berguna bila datanya mutakhir dan dipahami oleh pengguna di lapangan.</p>',
        sumber: 'Penerapan pendekatan sistem dan SIG pada kebencanaan gunung api'
      },
      soal: [
        {
          tipe: 'pg_singkat',
          level: 'C4',
          literasi: 'Mengenali komponen pendekatan sistem',
          numerasi: 'Menafsirkan data kegempaan dan deformasi',
          pertanyaan: 'Dalam kerangka pendekatan sistem pada kesiapsiagaan erupsi, data kegempaan dan deformasi berperan sebagai ...',
          opsi: [
            'Masukan yang diolah untuk menghasilkan analisis bahaya dan rekomendasi evakuasi.',
            'Keluaran akhir yang langsung menjadi keputusan evakuasi tanpa pengolahan.',
            'Umpan balik yang hanya dicatat setelah bencana selesai.',
            'Gangguan yang harus diabaikan agar model tetap sederhana.',
            'Proses yang menggantikan seluruh peran analisis kerentanan.'
          ],
          kunci: [0],
          pembahasan: 'Data pengamatan merupakan masukan yang diolah dalam proses analisis untuk menghasilkan keluaran berupa peta dan rekomendasi.'
        },
        {
          tipe: 'pgm',
          level: 'C5',
          literasi: 'Menganalisis manfaat SIG',
          numerasi: 'Menghubungkan data spasial dengan keputusan',
          pertanyaan: 'Perhatikan pernyataan berikut. (1) SIG memadukan zona bahaya dengan sebaran penduduk; (2) SIG membantu menentukan jalur evakuasi dan lokasi pengungsian; (3) Peta rawan bencana hanya berguna bila data mutakhir; (4) SIG menghapus kebutuhan verifikasi lapangan. Pernyataan yang tepat adalah ...',
          opsi: [
            '(1), (2), dan (3) saja',
            '(1) dan (4) saja',
            '(2) dan (4) saja',
            '(3) dan (4) saja',
            'Semua pernyataan benar'
          ],
          kunci: [0],
          pembahasan: 'Stimulus menegaskan peta berguna bila data mutakhir dan dipahami pengguna lapangan, sehingga verifikasi lapangan tetap diperlukan.'
        },
        {
          tipe: 'pg_kompleks',
          level: 'C5',
          literasi: 'Mengevaluasi keluaran sistem',
          numerasi: 'Menimbang keputusan berbasis peta',
          pertanyaan: 'Pilih semua pernyataan yang menunjukkan pemanfaatan keluaran SIG secara tepat dalam kesiapsiagaan bencana.',
          opsi: [
            'Menentukan jalur evakuasi dengan mempertimbangkan zona bahaya dan kapasitas jalan.',
            'Menetapkan lokasi pengungsian berdasarkan jarak dari zona bahaya dan ketersediaan fasilitas.',
            'Mengabaikan pembaruan data karena peta lama dianggap cukup.',
            'Memprioritaskan penyuluhan pada permukiman dengan kerentanan tertinggi.',
            'Menggunakan peta lama tanpa memperbarui data penggunaan lahan.'
          ],
          kunci: [0, 1, 3],
          pembahasan: 'Peta lama tanpa pembaruan berisiko menyesatkan keputusan, sehingga pernyataan ketiga tidak tepat.'
        },
        {
          tipe: 'menjodohkan',
          level: 'C4',
          literasi: 'Memasangkan komponen sistem dengan contohnya',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Jodohkan komponen sistem pada kolom kiri dengan contoh pada kolom kanan.',
          kiri: ['Masukan', 'Proses', 'Keluaran', 'Umpan balik', 'Gangguan'],
          kanan: [
            'Laporan lapangan yang memperbarui model bahaya',
            'Peta kawasan rawan bencana dan rencana evakuasi',
            'Data kegempaan, deformasi, dan cuaca',
            'Kerusakan alat sensor akibat abu vulkanik',
            'Analisis bahaya dan kerentanan'
          ],
          kunci: [2, 4, 1, 0, 3],
          pembahasan: 'Masukan (C), proses (E), keluaran (B), umpan balik (A), dan gangguan (D).'
        },
        {
          tipe: 'benar_salah',
          level: 'C4',
          literasi: 'Menilai pernyataan sistem kebencanaan',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Tentukan Benar (B) atau Salah (S) untuk setiap pernyataan berikut.',
          pernyataan: [
            'Dalam pendekatan sistem, umpan balik berperan memperbaiki model berdasarkan pengalaman lapangan.',
            'Peta rawan bencana tetap akurat meskipun data penggunaan lahan tidak diperbarui.',
            'SIG dapat memadukan zona bahaya dengan sebaran penduduk untuk perencanaan evakuasi.',
            'Pendekatan sistem mengabaikan hubungan antara masukan, proses, dan keluaran.'
          ],
          kunci: ['B', 'S', 'B', 'S'],
          pembahasan: 'Data yang tidak mutakhir menurunkan akurasi peta, dan pendekatan sistem justru menekankan hubungan masukan-proses-keluaran.'
        },
        {
          tipe: 'benar_salah',
          level: 'C5',
          literasi: 'Menilai kesiapsiagaan berbasis data',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Tentukan Benar (B) atau Salah (S) untuk pernyataan berikut tentang kesiapsiagaan bencana gunung api.',
          pernyataan: [
            'Jalur evakuasi perlu mempertimbangkan kapasitas jalan dan arah aliran lahar.',
            'Penyuluhan warga tidak perlu mempertimbangkan tingkat kerentanan kelompok.',
            'Pembaruan data pengamatan gunung api membantu meningkatkan ketepatan rekomendasi.',
            'Peta risiko cukup disimpan di kantor tanpa perlu dipahami petugas lapangan.'
          ],
          kunci: ['B', 'S', 'B', 'S'],
          pembahasan: 'Kerentanan kelompok dan pemahaman pengguna lapangan menentukan keberhasilan rencana evakuasi.'
        }
      ]
    },
    {
      stimulus: {
        jenis: 'teks',
        judul: 'Memilih antara Angka dan Cerita: Kuantitatif atau Kualitatif',
        isi: '<p>Seorang peneliti ingin mengetahui apakah jarak permukiman ke sungai berkaitan dengan perilaku membuang sampah. Ia dapat mengukur jarak rumah ke sungai dan mencatat frekuensi pembuangan sampah untuk diuji secara statistik. Ia juga dapat mewawancarai warga untuk memahami alasan di balik kebiasaan tersebut, misalnya keterbatasan layanan pengangkutan atau kebiasaan turun-temurun.</p><p>Keduanya tidak saling meniadakan. Angka menunjukkan pola umum, sedangkan cerita menjelaskan mengapa pola itu muncul. Simpulan yang kuat biasanya memadukan keduanya dan memeriksa apakah temuan konsisten pada berbagai sumber data.</p>',
        sumber: 'Sintesis metode kuantitatif dan kualitatif dalam kajian lingkungan'
      },
      soal: [
        {
          tipe: 'pg_singkat',
          level: 'C4',
          literasi: 'Membedakan fungsi data kuantitatif dan kualitatif',
          numerasi: 'Menafsirkan pola hasil pengukuran',
          pertanyaan: 'Pernyataan yang paling tepat menggambarkan fungsi data kualitatif dalam kajian perilaku membuang sampah adalah ...',
          opsi: [
            'Menjelaskan alasan dan pengalaman warga sehingga pola angka dapat dipahami konteksnya.',
            'Menggantikan seluruh kebutuhan pengukuran jarak dan frekuensi.',
            'Membuktikan hubungan statistik tanpa memerlukan data lapangan.',
            'Menghitung jumlah sampah yang dibuang setiap hari secara otomatis.',
            'Menentukan koordinat rumah responden tanpa pengukuran.'
          ],
          kunci: [0],
          pembahasan: 'Data kualitatif menjelaskan mengapa suatu pola terjadi, sedangkan pengukuran frekuensi dan jarak tetap memerlukan data kuantitatif.'
        },
        {
          tipe: 'pgm',
          level: 'C5',
          literasi: 'Mengevaluasi rancangan penelitian campuran',
          numerasi: 'Menimbang validitas data',
          pertanyaan: 'Perhatikan pernyataan berikut. (1) Angka menunjukkan pola umum perilaku; (2) Wawancara menjelaskan alasan di balik pola tersebut; (3) Pemeriksaan konsistensi antarsumber data meningkatkan keandalan simpulan; (4) Data kualitatif tidak dapat dipadukan dengan data kuantitatif. Pernyataan yang tepat adalah ...',
          opsi: [
            '(1), (2), dan (3) saja',
            '(1) dan (4) saja',
            '(2) dan (4) saja',
            '(3) dan (4) saja',
            'Semua pernyataan benar'
          ],
          kunci: [0],
          pembahasan: 'Stimulus menegaskan pentingnya memadukan angka dan cerita, sehingga pernyataan (4) bertentangan.'
        },
        {
          tipe: 'pg_kompleks',
          level: 'C5',
          literasi: 'Menilai kesimpulan penelitian',
          numerasi: 'Menimbang bukti korelasi dan penjelasan',
          pertanyaan: 'Pilih semua pernyataan yang tepat mengenai simpulan penelitian tentang perilaku membuang sampah.',
          opsi: [
            'Korelasi antara jarak dan frekuensi pembuangan perlu disertai penjelasan konteks agar tidak salah tafsir.',
            'Wawancara dapat mengungkap keterbatasan layanan pengangkutan yang tidak terlihat pada angka.',
            'Korelasi statistik otomatis membuktikan hubungan sebab-akibat tanpa penjelasan tambahan.',
            'Pemeriksaan silang antara kuesioner dan wawancara membantu menguji konsistensi temuan.',
            'Korelasi statistik cukup menjadi dasar tunggal tanpa memerlukan data pendukung.'
          ],
          kunci: [0, 1, 3],
          pembahasan: 'Korelasi tidak otomatis membuktikan sebab-akibat; diperlukan penalaran dan bukti tambahan untuk menjelaskan mekanismenya.'
        },
        {
          tipe: 'menjodohkan',
          level: 'C4',
          literasi: 'Memasangkan jenis data dengan kegunaannya',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Jodohkan jenis data pada kolom kiri dengan kegunaannya pada kolom kanan.',
          kiri: ['Jarak rumah ke sungai', 'Frekuensi pembuangan sampah', 'Transkrip wawancara', 'Foto kondisi sungai', 'Catatan observasi lapangan'],
          kanan: [
            'Menjelaskan alasan dan pengalaman warga',
            'Menunjukkan pola umum yang dapat diuji',
            'Mendokumentasikan kondisi fisik secara visual',
            'Mengukur variabel keruangan secara kuantitatif',
            'Merekam perilaku dan situasi saat pengamatan'
          ],
          kunci: [3, 1, 0, 2, 4],
          pembahasan: 'Jarak (D), frekuensi (B), transkrip (A), foto (C), dan catatan observasi (E).'
        },
        {
          tipe: 'benar_salah',
          level: 'C4',
          literasi: 'Menilai pernyataan metodologis',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Tentukan Benar (B) atau Salah (S) untuk setiap pernyataan berikut.',
          pernyataan: [
            'Data kuantitatif dan kualitatif dapat dipadukan untuk menghasilkan simpulan yang lebih utuh.',
            'Korelasi statistik selalu membuktikan hubungan sebab-akibat tanpa perlu penjelasan.',
            'Wawancara dapat mengungkap keterbatasan layanan yang tidak tampak pada data angka.',
            'Data kualitatif tidak memerlukan pemeriksaan keandalan sama sekali.'
          ],
          kunci: ['B', 'S', 'B', 'S'],
          pembahasan: 'Korelasi bukan bukti sebab-akibat, dan data kualitatif tetap memerlukan pemeriksaan keandalan serta triangulasi.'
        },
        {
          tipe: 'menjodohkan',
          level: 'C5',
          literasi: 'Memasangkan pertanyaan dengan pendekatan yang sesuai',
          numerasi: 'Tidak dominan',
          pertanyaan: 'Jodohkan pertanyaan penelitian pada kolom kiri dengan pendekatan yang paling sesuai pada kolom kanan.',
          kiri: [
            'Berapa korelasi jarak rumah ke sungai dengan frekuensi pembuangan sampah',
            'Mengapa warga tetap membuang sampah ke sungai meskipun ada aturan',
            'Bagaimana perubahan kebiasaan pembuangan sampah dalam sepuluh tahun terakhir',
            'Bagaimana seluruh temuan dipadukan menjadi rekomendasi kebijakan satu kecamatan',
            'Bagaimana aliran sampah dari permukiman memengaruhi kualitas air di hilir'
          ],
          kanan: ['Historis', 'Korologis', 'Kuantitatif', 'Kelingkungan', 'Kualitatif'],
          kunci: [2, 4, 0, 1, 3],
          pembahasan: 'Korelasi (C), alasan warga (E), perubahan waktu (A), paduan rekomendasi wilayah (B), dan aliran sampah ke hilir (D).'
        }
      ]
    }
  ]
};
