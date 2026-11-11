// Seed tugas "Tugas Mengamati Video" untuk kanal Animal Scripts:
// "Hutan Kalimantan: Lebih Purba dari Amazon dan Cerita Hutan Lainnya"
// https://www.youtube.com/watch?v=U62olgH5e5A (durasi 4029 detik)
//
// 30 soal: 24 soal analisis pilihan ganda + 6 soal uraian (HOTS) yang jawabannya
// hanya bisa ditemukan dari isi video.
// Jalankan: node scripts/seed-video-task-hutan-kalimantan.js [--class "Nama Kelas"] [--force]
// Tanpa --class, tugas tampil untuk semua kelas.
const path = require('path');
const fs = require('fs');
const dataStore = require('../data-store');
const { buildTaskData } = require('../video-task');

const TASK_ID = 'video-hutan-kalimantan-sumatera';
const YOUTUBE_ID = 'U62olgH5e5A';
const DURATION = 4029;

const SOAL = [
  {
    waktu: 100,
    pertanyaan: 'Video menyebut hutan Kalimantan berusia 130-140 juta tahun, sedangkan hutan Amazon sekitar 55 juta tahun. Simpulan biogeografis yang paling tepat dari perbandingan tersebut adalah ...',
    opsi: [
      'Hutan Kalimantan lebih luas sehingga otomatis lebih tua daripada Amazon',
      'Stabilitas ekosistem yang sangat panjang memungkinkan proses spesiasi berlangsung lama sehingga endemisitasnya tinggi',
      'Hutan Amazon lebih penting karena usianya lebih muda dan lebih dinamis',
      'Usia hutan tidak berhubungan dengan jumlah spesies yang hidup di dalamnya'
    ],
    kunci: 1,
    pembahasan: 'Konsep 1 - Usia dan stabilitas ekosistem. Video menyebut usia 130-140 juta tahun berbanding 55 juta tahun (0:20-0:40), lalu menjelaskan 15.000 jenis tumbuhan dengan 6.000 di antaranya endemik; waktu evolusi panjang memungkinkan spesiasi berlangsung lama.'
  },
  {
    waktu: 185,
    pertanyaan: 'Video menyebut sekitar 15.000 jenis tumbuhan di hutan Kalimantan dan lebih dari 6.000 di antaranya tidak ditemukan di tempat lain di dunia. Pernyataan yang paling tepat mengenai kelompok tumbuhan tersebut adalah ...',
    opsi: [
      'Tumbuhan tersebut endemik, sehingga hilangnya habitat di Kalimantan berarti kepunahan global',
      'Tumbuhan tersebut invasif karena hanya hidup di satu pulau',
      'Tumbuhan tersebut kosmopolitan karena tersebar di tiga negara',
      'Tumbuhan tersebut dapat dipindahkan ke Amazon tanpa kehilangan keragaman'
    ],
    kunci: 0,
    pembahasan: 'Konsep 2 - Endemisitas. Angka 6.000 dari 15.000 jenis (0:55-1:10) menunjukkan spesies endemik; kehilangan habitat bersifat global, bukan sekadar lokal.'
  },
  {
    waktu: 255,
    pertanyaan: 'Lapisan teratas hutan Kalimantan dihuni pohon setinggi 70 meter dan menjadi tempat bersarang burung besar seperti elang dan rangkong. Alasan ekologis yang paling tepat adalah ...',
    opsi: [
      'Lapisan teratas memiliki tanah paling subur sehingga banyak serangga',
      'Lapisan teratas lebih dekat ke air tanah sehingga aman dari predator',
      'Lapisan teratas memberi pandangan luas untuk mencari mangsa dan mengawasi wilayah kekuasaan',
      'Lapisan teratas memiliki kelembapan paling tinggi sehingga cocok untuk sarang'
    ],
    kunci: 2,
    pembahasan: 'Konsep 3 - Stratifikasi vertikal. Video menyebut pohon setinggi 70 m dan burung besar yang membutuhkan pandangan luas untuk mencari mangsa atau wilayah kekuasaan (2:00-2:20).'
  },
  {
    waktu: 400,
    pertanyaan: 'Lantai hutan hanya menerima sekitar 1-2 persen cahaya matahari dan kehidupannya didominasi proses pembusukan. Peran ekologis utama lapisan ini adalah ...',
    opsi: [
      'Menguraikan materi organik menjadi nutrien yang diserap kembali oleh akar pohon',
      'Menghasilkan oksigen dalam jumlah terbesar melalui fotosintesis',
      'Menjadi tempat berkembang biaknya burung pemakan buah',
      'Menahan air hujan sehingga tidak masuk ke dalam tanah'
    ],
    kunci: 0,
    pembahasan: 'Konsep 4 - Dekomposisi dan daur nutrien. Video menegaskan lantai hutan menerima 1-2 persen cahaya dan didominasi pembusukan oleh jamur, bakteri, serangga, serta invertebrata (3:40-4:20).'
  },
  {
    waktu: 445,
    pertanyaan: 'Struktur berlapis hutan menciptakan ribuan relung ekologis yang berbeda. Konsekuensi paling penting dari kondisi tersebut bagi keanekaragaman hayati adalah ...',
    opsi: [
      'Spesies saling bersaing lebih keras karena ruang hidup terbatas',
      'Spesies dapat hidup berdampingan dengan tekanan kompetisi langsung yang lebih rendah',
      'Jumlah spesies menurun karena hanya spesies terkuat yang bertahan',
      'Seluruh spesies menempati satu lapisan yang sama'
    ],
    kunci: 1,
    pembahasan: 'Konsep 5 - Relung ekologis. Video menyatakan struktur berlapis memungkinkan banyak spesies hidup berdampingan tanpa bersaing secara langsung, sehingga biodiversitas meningkat (4:10-4:45).'
  },
  {
    waktu: 490,
    pertanyaan: 'Orangutan memiliki rentang lengan lebih dari 2 meter, jari tangan dan kaki panjang melengkung seperti kait, dan betina dewasa hampir tidak pernah turun ke lantai hutan. Kesimpulan yang paling tepat adalah ...',
    opsi: [
      'Tubuh orangutan berevolusi untuk kehidupan arboreal di kanopi',
      'Orangutan menghindari kanopi karena takut ketinggian',
      'Bentuk tubuh orangutan tidak berhubungan dengan habitatnya',
      'Orangutan lebih memilih hidup di lantai hutan yang gelap'
    ],
    kunci: 0,
    pembahasan: 'Konsep 6 - Adaptasi morfologi. Video menjelaskan brakiasi, jari seperti kait, dan kanopi sebagai dunia orangutan (5:50-6:45).'
  },
  {
    waktu: 565,
    pertanyaan: 'Bayi orangutan tinggal bersama induknya selama 6-8 tahun dan seekor betina hanya melahirkan sekitar satu anak setiap 8 tahun. Implikasi konservasi paling penting dari data tersebut adalah ...',
    opsi: [
      'Populasi orangutan pulih sangat lambat sehingga kematian satu betina dewasa berdampak besar',
      'Orangutan cepat menambah populasi karena masa pengasuhan panjang',
      'Orangutan tidak membutuhkan perlindungan karena tingkat kelahirannya tinggi',
      'Orangutan dapat dipindahkan ke habitat baru tanpa memperhatikan struktur umur'
    ],
    kunci: 0,
    pembahasan: 'Konsep 7 - Sejarah hidup dan laju pertumbuhan populasi. Pengasuhan 6-8 tahun dan interval kelahiran sekitar 8 tahun (7:00-7:45) membuat laju reproduksi sangat lambat.'
  },
  {
    waktu: 605,
    pertanyaan: 'Orangutan memakan buah, lalu mengeluarkan biji utuh bersama kotoran jauh dari pohon induk. Manfaat ekologis dari proses tersebut adalah ...',
    opsi: [
      'Biji menjadi rusak sehingga pohon induk tidak berkompetisi',
      'Biji tersebar ke lokasi baru, terhindar dari persaingan dengan pohon induk, dan memperoleh pupuk alami',
      'Kotoran orangutan membunuh biji agar tidak tumbuh',
      'Biji hanya tersebar di sekitar pohon induk sehingga keragaman genetik menurun'
    ],
    kunci: 1,
    pembahasan: 'Konsep 8 - Penyebaran biji. Video menyebut biji kecil tertelan utuh, keluar bersama kotoran di lokasi jauh, dan mendapat pupuk alami (8:10-8:55).'
  },
  {
    waktu: 700,
    pertanyaan: 'Bekantan jantan memiliki hidung besar dan menjuntai yang berfungsi sebagai ruang resonansi. Analisis yang paling tepat mengenai ciri tersebut adalah ...',
    opsi: [
      'Ciri tersebut memperkuat panggilan untuk menarik betina dan mengintimidasi jantan saingan',
      'Ciri tersebut membantu bekantan menyaring air sungai yang keruh',
      'Ciri tersebut digunakan untuk menggali tanah mencari akar',
      'Ciri tersebut tidak memiliki fungsi karena hanya hiasan'
    ],
    kunci: 0,
    pembahasan: 'Konsep 9 - Seleksi seksual dan komunikasi. Video menyebut hidung jantan berfungsi sebagai ruang resonansi yang memperkuat panggilan untuk menarik betina atau mengintimidasi jantan lain (10:20-11:00).'
  },
  {
    waktu: 825,
    pertanyaan: 'Balung Rangkong Gading tersusun dari keratin padat dan dijuluki "gading merah", berbeda dari rangkong lain yang balungnya berongga. Analisis yang paling tepat mengenai julukan tersebut adalah ...',
    opsi: [
      'Julukan itu menjelaskan mengapa burung ini menjadi sasaran perburuan sehingga tekanannya terhadap populasi lebih besar',
      'Julukan itu menunjukkan bahwa balung dapat digunakan sebagai obat sehingga burung dilindungi',
      'Julukan itu menandakan balung berongga sehingga ringan untuk terbang',
      'Julukan itu tidak berhubungan dengan ancaman konservasi'
    ],
    kunci: 0,
    pembahasan: 'Konsep 10 - Nilai ekonomi satwa dan ancaman perburuan. Video menyebut balung padat berbahan keratin mirip gading gajah (13:30-14:15); sifat ini menjadikannya komoditas sehingga perburuan meningkat.'
  },
  {
    waktu: 1010,
    pertanyaan: 'Macan dahan memiliki pergelangan kaki sangat fleksibel yang dapat berputar ke belakang dan ekor panjang hampir sepanjang tubuh. Fungsi utama ciri tersebut adalah ...',
    opsi: [
      'Memungkinkan turun dari pohon dengan kepala lebih dulu dan menjaga keseimbangan di dahan sempit',
      'Membantu berenang di sungai berarus deras',
      'Memungkinkan menggali tanah untuk mencari air',
      'Membantu memecah biji buah keras'
    ],
    kunci: 0,
    pembahasan: 'Konsep 11 - Adaptasi arboreal predator. Video menyebut pergelangan kaki yang berputar dan ekor panjang untuk keseimbangan saat turun kepala lebih dulu (16:20-17:00).'
  },
  {
    waktu: 1280,
    pertanyaan: 'Gajah Kalimantan merobohkan vegetasi kecil, membuka jalur, menyebarkan biji besar melalui kotoran, dan menggali dasar sungai kering. Kesimpulan yang paling tepat mengenai perannya adalah ...',
    opsi: [
      'Gajah hanya merusak hutan sehingga tidak berperan bagi spesies lain',
      'Gajah adalah insinyur ekosistem yang menciptakan habitat dan sumber air bagi banyak spesies lain',
      'Gajah berperan sebagai predator puncak di kanopi',
      'Gajah hanya berperan sebagai penyerbuk bunga raflesia'
    ],
    kunci: 1,
    pembahasan: 'Konsep 12 - Spesies insinyur ekosistem. Video menyebut jalur, celah cahaya, penyebaran biji besar, pupuk kotoran, dan lubang air di sungai kering (20:00-21:40).'
  },
  {
    waktu: 1450,
    pertanyaan: 'Raflesia adalah holoparasit tanpa klorofil, tanpa daun, batang, dan akar sejati, serta hidup sebagai jaringan filamen di dalam tumbuhan inang Tetrastigma. Implikasi konservasi yang paling tepat adalah ...',
    opsi: [
      'Raflesia mudah dibudidayakan di luar habitat karena tidak membutuhkan inang',
      'Kelangsungan hidup Raflesia bergantung mutlak pada keberadaan inang sehingga sangat rentan terhadap gangguan habitat',
      'Raflesia dapat berfotosintesis sendiri sehingga tahan terhadap kerusakan hutan',
      'Raflesia tidak memiliki hubungan dengan tumbuhan lain'
    ],
    kunci: 1,
    pembahasan: 'Konsep 13 - Parasitisme obligat dan spesialisasi. Video menyebut holoparasit, tanpa klorofil, dan hidup dalam jaringan Tetrastigma (23:00-23:50).'
  },
  {
    waktu: 1700,
    pertanyaan: 'Hutan Indonesia hanya sekitar 1 persen daratan bumi, tetapi menjadi rumah bagi sekitar 10 persen jenis tumbuhan dan 12 persen jenis mamalia dunia. Penjelasan yang paling tepat adalah ...',
    opsi: [
      'Indonesia memiliki iklim tropis, posisi geografis, dan sejarah biogeografi yang mendukung spesiasi tinggi',
      'Indonesia memiliki luas daratan terbesar di dunia',
      'Spesies di Indonesia berasal dari satu wilayah yang sama tanpa isolasi',
      'Keanekaragaman tinggi terjadi karena tidak ada aktivitas manusia'
    ],
    kunci: 0,
    pembahasan: 'Konsep 14 - Mega-biodiversitas. Video menyebut 1 persen daratan dengan proporsi spesies yang besar (26:00-26:45); iklim tropis yang stabil, posisi di garis khatulistiwa, dan sejarah geologi kepulauan menjelaskan pola tersebut.'
  },
  {
    waktu: 1900,
    pertanyaan: 'Orangutan Sumatera menggunakan ranting untuk menggali serangga, daun sebagai sendok minum, dan kembali beberapa hari kemudian untuk memanen buah yang sebelumnya belum matang. Kemampuan tersebut menunjukkan ...',
    opsi: [
      'Perilaku refleks yang tidak melibatkan pembelajaran',
      'Penggunaan alat dan perencanaan masa depan yang menunjukkan memori serta kecerdasan tinggi',
      'Ketergantungan pada manusia untuk memperoleh makanan',
      'Kemampuan berfotosintesis pada daun yang digunakan'
    ],
    kunci: 1,
    pembahasan: 'Konsep 15 - Kognisi satwa. Video menyebut penggunaan alat sederhana dan kemampuan merencanakan panen buah yang belum matang (33:00-34:05).'
  },
  {
    waktu: 2260,
    pertanyaan: 'Harimau Sumatera tidak mengejar mangsa dengan kecepatan tinggi, tetapi mengendap-endap lalu menyerang pada jarak 5-10 meter. Ketergantungan strategi ini pada kondisi hutan menjelaskan bahwa ...',
    opsi: [
      'Harimau membutuhkan tutupan vegetasi rapat untuk mendekati mangsa tanpa terdeteksi',
      'Harimau lebih efektif berburu di lahan terbuka tanpa vegetasi',
      'Harimau tidak membutuhkan mangsa berukuran besar',
      'Harimau berburu secara berkelompok seperti singa'
    ],
    kunci: 0,
    pembahasan: 'Konsep 16 - Relung predator dan struktur habitat. Video menyebut pengintaian, jarak serang 5-10 m, serta loreng yang membaur dengan belang cahaya (37:40-39:10).'
  },
  {
    waktu: 2450,
    pertanyaan: 'Video menyebut harimau sebagai "polisi hutan" yang menjaga keseimbangan populasi herbivora. Prediksi yang paling tepat jika harimau punah di suatu kawasan adalah ...',
    opsi: [
      'Populasi rusa dan babi hutan meningkat sehingga vegetasi serta regenerasi hutan terganggu',
      'Populasi rusa menurun sehingga hutan menjadi lebih rapat',
      'Tidak ada perubahan karena herbivora diatur oleh cuaca',
      'Populasi macan dahan langsung punah'
    ],
    kunci: 0,
    pembahasan: 'Konsep 17 - Efek trofik berantai. Video menjelaskan ledakan herbivora akan merusak vegetasi secara berlebihan jika harimau hilang (39:50-40:30).'
  },
  {
    waktu: 2560,
    pertanyaan: 'Badak Sumatera berendam di kubangan lumpur dan mengonsumsi lebih dari 50 kg tumbuhan per hari dengan mulut prehensil. Analisis yang paling tepat mengenai dua perilaku tersebut adalah ...',
    opsi: [
      'Kubangan hanya untuk bermain, sedangkan mulut prehensil tidak berhubungan dengan makan',
      'Kubangan membantu pendinginan tubuh dan perlindungan dari parasit, sedangkan mulut prehensil memudahkan meraih daun dan tunas',
      'Kubangan digunakan untuk menyimpan makanan, sedangkan mulut prehensil untuk menggali air',
      'Kedua perilaku menunjukkan bahwa badak adalah predator puncak'
    ],
    kunci: 1,
    pembahasan: 'Konsep 18 - Adaptasi fisiologis dan morfologis. Video menyebut lumpur mendinginkan tubuh serta melindungi kulit dari serangga dan parasit, dan mulut prehensil untuk meraih dedaunan (41:20-42:45).'
  },
  {
    waktu: 2720,
    pertanyaan: 'Gajah Sumatera mengonsumsi sekitar 150 kg dedaunan dan buah per hari serta minum hingga 180 liter air. Jejak kakinya yang membentuk cekungan dapat terisi air hujan. Simpulan ekologis yang paling tepat adalah ...',
    opsi: [
      'Kebutuhan makan yang besar membuat gajah merusak seluruh vegetasi hutan',
      'Aktivitas gajah menciptakan kolam kecil dan jalur yang bermanfaat bagi spesies lain, sehingga gajah berperan sebagai insinyur ekosistem',
      'Jejak kaki gajah mempercepat erosi sehingga tidak bermanfaat',
      'Gajah bersaing langsung dengan kecebong dan ikan'
    ],
    kunci: 1,
    pembahasan: 'Konsep 19 - Rekayasa ekosistem. Video menyebut 150 kg pakan per hari, 180 liter air, jalur gajah, serta cekungan jejak kaki sebagai kolam bagi kecebong dan ikan (43:50-45:20).'
  },
  {
    waktu: 3070,
    pertanyaan: 'Video menyebut kanopi menahan 15-35 persen curah hujan, tanah hutan menyerap hingga 55 persen air hujan, dan hanya 10-20 persen menjadi limpasan permukaan. Data tersebut menjelaskan bahwa ...',
    opsi: [
      'Hutan memperlambat dan mengurangi limpasan sehingga menurunkan risiko banjir bandang',
      'Hutan mempercepat aliran air ke sungai sehingga banjir lebih cepat terjadi',
      'Hutan menahan seluruh air hujan sehingga tidak ada air yang mencapai sungai',
      'Tanah hutan menolak air sehingga limpasan selalu 100 persen'
    ],
    kunci: 0,
    pembahasan: 'Konsep 20 - Jasa hidrologi hutan. Video menyebut intersepsi 15-35 persen, infiltrasi 55 persen, dan limpasan 10-20 persen (51:40-52:40).'
  },
  {
    waktu: 3260,
    pertanyaan: 'Sekitar 25-40 persen curah hujan kembali ke atmosfer melalui transpirasi dan membentuk "sungai langit" yang memengaruhi pola hujan hingga ratusan kilometer. Implikasi paling tepat adalah ...',
    opsi: [
      'Deforestasi di suatu wilayah dapat mengurangi curah hujan di wilayah lain yang jauh',
      'Transpirasi tidak berpengaruh terhadap iklim regional',
      'Hutan hanya menyimpan air dan tidak melepaskannya kembali',
      'Sungai langit hanya terbentuk di atas lautan'
    ],
    kunci: 0,
    pembahasan: 'Konsep 21 - Siklus air regional. Video menjelaskan transpirasi 25-40 persen, pembentukan awan hujan lokal, dan sungai langit yang memengaruhi hujan ratusan kilometer jauhnya (52:20-53:10).'
  },
  {
    waktu: 3420,
    pertanyaan: 'Air hujan yang meresap melalui serasah, humus, jaringan akar, dan mikroorganisme menjadi lebih jernih. Fungsi hutan dalam hal ini adalah ...',
    opsi: [
      'Sebagai filter alami yang menyaring polutan dan sedimen sebelum air masuk ke sungai',
      'Sebagai sumber polutan yang meningkatkan sedimen',
      'Sebagai penghasil air hujan buatan',
      'Sebagai penghalang yang mencegah air meresap ke tanah'
    ],
    kunci: 0,
    pembahasan: 'Konsep 22 - Kualitas air dan daerah tangkapan. Video menyebut penyaringan alami oleh serasah, humus, akar, dan mikroorganisme (53:40-54:25).'
  },
  {
    waktu: 3720,
    pertanyaan: 'Urutan dampak deforestasi terhadap siklus hidrologi yang paling tepat menurut video adalah ...',
    opsi: [
      'Hilangnya tutupan hutan, berkurangnya infiltrasi, meningkatnya limpasan, lalu banjir pada musim hujan dan kekeringan pada musim kemarau',
      'Hilangnya tutupan hutan, meningkatnya infiltrasi, lalu sungai menjadi stabil sepanjang tahun',
      'Hilangnya tutupan hutan, menurunnya penguapan, lalu curah hujan meningkat',
      'Hilangnya tutupan hutan, tanah menjadi lebih subur, lalu banjir berkurang'
    ],
    kunci: 0,
    pembahasan: 'Konsep 23 - Rantai dampak deforestasi. Video menyebut deforestasi merusak siklus hidrologi, sungai fluktuatif, banjir saat hujan, kekeringan saat kemarau, dan air tanah menipis (62:00-63:30).'
  },
  {
    waktu: 3800,
    pertanyaan: 'Video menyebut 772 spesies Indonesia terancam punah, 147 di antaranya mamalia (tertinggi di dunia), harimau Jawa dan Bali telah punah, serta Indonesia pernah menjadi pengemisi karbon terbesar ketiga dunia. Simpulan yang paling tepat adalah ...',
    opsi: [
      'Deforestasi hanya berdampak lokal pada spesies, tanpa kaitan dengan iklim global',
      'Deforestasi berdampak ganda, yaitu hilangnya biodiversitas hingga kepunahan lokal dan meningkatnya emisi karbon global',
      'Kepunahan lokal tidak pernah terjadi di Indonesia',
      'Emisi karbon Indonesia hanya berasal dari industri, bukan kebakaran hutan'
    ],
    kunci: 1,
    pembahasan: 'Konsep 24 - Dampak ganda deforestasi. Video menyebut 772 spesies terancam, 147 mamalia terancam, kepunahan harimau Jawa dan Bali, serta emisi karbon dari kebakaran gambut (64:00-65:30).'
  },
  {
    waktu: 1560,
    tipe: 'uraian',
    pertanyaan: 'Jelaskan mengapa hutan Kalimantan disebut lebih "purba" daripada hutan Amazon, lalu uraikan bagaimana struktur berlapis hutan menciptakan keanekaragaman hayati yang tinggi. Sertakan pula peran orangutan dan rangkong sebagai penyebar biji dalam menjaga regenerasi hutan.',
    kunci_uraian: 'Hutan Kalimantan berusia sekitar 130-140 juta tahun, jauh lebih tua daripada hutan Amazon yang berusia sekitar 55 juta tahun, sehingga proses spesiasi berlangsung sangat lama dan menghasilkan sekitar 15.000 jenis tumbuhan dengan lebih dari 6.000 jenis endemik. Struktur berlapis terdiri atas lapisan emergen setinggi 70 meter, kanopi 30-40 meter, understory, dan lantai hutan yang hanya menerima 1-2 persen cahaya. Setiap lapisan menyediakan relung ekologis berbeda sehingga banyak spesies dapat hidup berdampingan dengan tekanan kompetisi langsung yang lebih rendah. Orangutan dan rangkong memakan buah lalu menyebarkan biji jauh dari pohon induk melalui kotoran atau muntahan, sehingga biji terhindar dari persaingan dengan pohon induk dan hutan mengalami regenerasi alami.',
    kata_kunci: ['130', 'endemik', 'kanopi', 'relung', 'menyebarkan biji'],
    pembahasan: 'Konsep sintesis - Usia, stratifikasi, dan regenerasi hutan. Rujuk 0:20-0:40, 2:00-4:45, 7:00-8:55, dan 13:30-14:30.'
  },
  {
    waktu: 2050,
    tipe: 'uraian',
    pertanyaan: 'Hutan Sumatera menyumbang keanekaragaman hayati yang jauh lebih besar daripada proporsi luas daratannya, dan disebut sebagai satu-satunya tempat harimau, gajah, orangutan, serta badak hidup bersama. Analisis implikasi kondisi tersebut bagi perencanaan tata ruang dan strategi konservasi di Sumatera.',
    kunci_uraian: 'Hutan Sumatera hanya sekitar 1 persen daratan bumi, tetapi menjadi rumah bagi sekitar 10 persen jenis tumbuhan dan 12 persen jenis mamalia dunia, dengan sekitar 10.000 jenis tumbuhan, lebih dari 200 spesies mamalia, dan sekitar 580 spesies burung. Sumatera adalah satu-satunya ekosistem tempat harimau, gajah, orangutan, dan badak hidup bersama, sehingga kawasan ini memiliki nilai konservasi global dan ditetapkan UNESCO sebagai warisan dunia. Konsekuensinya, tata ruang harus menjaga konektivitas hutan, mencegah fragmentasi oleh perkebunan dan jalan, serta menetapkan koridor yang menghubungkan taman nasional sebagai benteng terakhir. Konservasi tidak cukup dengan melindungi satu spesies, tetapi harus mempertahankan ekosistem utuh agar keempat satwa besar tetap memiliki ruang jelajah.',
    kata_kunci: ['1 persen', 'warisan dunia', 'koridor', 'fragmentasi', 'taman nasional'],
    pembahasan: 'Konsep sintesis - Nilai konservasi dan tata ruang. Rujuk 26:00-28:45 dan 48:20-50:10.'
  },
  {
    waktu: 2400,
    tipe: 'uraian',
    pertanyaan: 'Video menyebut harimau Sumatera sebagai "polisi hutan". Uraikan peran ekologis predator puncak tersebut, prediksi dampak yang terjadi bila populasinya terus menurun hingga punah di alam liar, lalu ajukan minimal dua kebijakan untuk mencegahnya.',
    kunci_uraian: 'Harimau Sumatera adalah predator puncak yang mengendalikan populasi herbivora seperti rusa sambar, kijang, dan babi hutan. Jika harimau punah, populasi herbivora dapat meledak sehingga tunas dan vegetasi hutan habis dimakan dan regenerasi hutan terganggu. Hilangnya predator juga mengubah perilaku mangsa serta keseimbangan jaring-jaring makanan. Populasi harimau kini tinggal sekitar 400 ekor sehingga kebijakan yang diperlukan adalah menjaga koridor dan konektivitas habitat, memberantas perburuan serta perdagangan ilegal, melindungi populasi mangsa, dan mengurangi konflik dengan masyarakat melalui penataan ruang serta patroli bersama.',
    kata_kunci: ['predator puncak', 'herbivora', 'koridor', 'perburuan', '400'],
    pembahasan: 'Konsep sintesis - Efek trofik dan kebijakan konservasi. Rujuk 36:00-40:30.'
  },
  {
    waktu: 3000,
    tipe: 'uraian',
    pertanyaan: 'Hutan digambarkan sebagai "bank air". Gunakan data intersepsi kanopi, daya serap tanah, limpasan permukaan, dan transpirasi dari video untuk menjelaskan mengapa deforestasi dapat menyebabkan banjir pada musim hujan sekaligus kekeringan pada musim kemarau. Kaitkan jawaban dengan pengelolaan daerah tangkapan air.',
    kunci_uraian: 'Kanopi menahan sekitar 15-35 persen curah hujan sebelum mencapai tanah, tanah hutan menyerap hingga 55 persen air hujan, dan hanya 10-20 persen yang menjadi limpasan permukaan. Akar pohon memperbesar pori tanah dan menahan air sehingga air keluar perlahan sebagai mata air. Sekitar 25-40 persen curah hujan kembali ke atmosfer melalui transpirasi dan membentuk sungai langit yang memengaruhi pola hujan. Jika hutan ditebang, intersepsi dan infiltrasi hilang sehingga limpasan meningkat dan banjir bandang terjadi pada musim hujan, sementara air tidak tersimpan dan mata air mengering pada musim kemarau. Karena itu pengelolaan daerah tangkapan air harus mempertahankan tutupan hutan, melakukan reboisasi lereng, dan mengatur penggunaan lahan di bagian hulu.',
    kata_kunci: ['intersepsi', 'infiltrasi', 'limpasan', 'transpirasi', 'daerah tangkapan air'],
    pembahasan: 'Konsep sintesis - Hidrologi hutan. Rujuk 50:00-54:25.'
  },
  {
    waktu: 3480,
    tipe: 'uraian',
    pertanyaan: 'Jelaskan mengapa deforestasi di Indonesia merupakan masalah global, bukan hanya lokal. Gunakan data tentang kemampuan hutan menyerap karbon, produksi oksigen, dan posisi Indonesia sebagai negara mega-biodiversitas.',
    kunci_uraian: 'Hutan dunia menyerap hingga sepertiga emisi karbon dioksida fosil global, sehingga hilangnya hutan mengurangi kemampuan bumi menyerap karbon dan mempercepat pemanasan global. Satu pohon dewasa menghasilkan oksigen yang cukup untuk kebutuhan empat orang selama satu tahun. Sebagai negara mega-biodiversitas, Indonesia hanya sekitar 1,3 persen luas daratan bumi, tetapi menyimpan sekitar 10 persen jenis tumbuhan berbunga, 12 persen spesies mamalia, 16 persen reptil dan amfibi, 17 persen burung, dan 33 persen jenis serangga dunia. Deforestasi dan kebakaran gambut melepaskan karbon tersimpan serta asap beracun, dan Indonesia pernah menjadi pengemisi karbon terbesar ketiga dunia. Karena itu hilangnya hutan Indonesia mengurangi jasa lingkungan yang dirasakan seluruh dunia.',
    kata_kunci: ['karbon', 'oksigen', 'biodiversitas', 'emisi', 'pemanasan global'],
    pembahasan: 'Konsep sintesis - Jasa lingkungan global. Rujuk 54:00-58:45 dan 64:00-66:10.'
  },
  {
    waktu: 3900,
    tipe: 'uraian',
    pertanyaan: 'Video menyebut 772 spesies Indonesia terancam punah, 147 di antaranya mamalia (tertinggi di dunia), harimau Jawa dan Bali telah punah, serta sekitar 25 orangutan Kalimantan hilang per hari pada puncak deforestasi. Analisis pertukaran antara keuntungan ekonomi dan kerugian ekologis dari deforestasi, lalu ajukan strategi pembangunan yang lebih berkelanjutan.',
    kunci_uraian: 'Deforestasi memberi keuntungan ekonomi jangka pendek berupa kayu dan perluasan lahan perkebunan, tetapi menimbulkan kerugian ekologis besar, yaitu hilangnya habitat, kepunahan lokal seperti harimau Jawa dan Bali, penurunan populasi satwa, erosi dan pendangkalan sungai, banjir, kekeringan, serta emisi karbon. Hilangnya satu spesies dapat menimbulkan efek domino pada jaring-jaring makanan dan menghilangkan potensi ilmu pengetahuan seperti bahan obat yang belum diteliti. Pembangunan berkelanjutan harus membatasi konversi hutan, menerapkan moratorium pembukaan lahan, merestorasi gambut dan hutan terdegradasi, mengembangkan ekonomi non-kayu seperti jasa lingkungan dan ekowisata, serta menegakkan hukum dan pemantauan tutupan hutan.',
    kata_kunci: ['kepunahan', 'habitat', 'emisi', 'moratorium', 'restorasi', 'ekowisata'],
    pembahasan: 'Konsep sintesis - Pertukaran ekonomi-ekologi dan pembangunan berkelanjutan. Rujuk 62:00-66:40.'
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
    judul: 'Hutan Kalimantan dan Sumatera: Analisis Ekosistem, Jasa Lingkungan, dan Deforestasi',
    deskripsi: 'Tonton video sampai selesai. Video tidak bisa dilewati dan 30 soal (24 soal analisis pilihan ganda + 6 soal uraian) muncul otomatis pada bagian video yang relevan. Jawaban uraian dinilai otomatis dari kemiripan dan relevansi dengan kunci.',
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
  const pg = built.data.soal.filter(item => item.tipe === 'pg').length;
  const uraian = built.data.soal.filter(item => item.tipe === 'uraian').length;
  console.log(`Komposisi soal: ${pg} pilihan ganda + ${uraian} uraian = ${built.data.soal.length}`);
  console.log(`Video: https://www.youtube.com/watch?v=${YOUTUBE_ID} - durasi ${DURATION} detik`);
  console.log(`Kelas: ${classId ? args.class : 'semua kelas'}`);
}

main().catch(error => {
  console.error('Gagal membuat tugas video:', error.message);
  process.exit(1);
});
