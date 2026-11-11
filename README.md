# LMS Geografi Multi-Tenant

Aplikasi Learning Management System (LMS) multi-tenant untuk mata pelajaran Geografi SMA kelas X-XII. Dapat digunakan oleh banyak guru/sekolah di Indonesia dengan server yang ringan.

## Fitur

### Multi-Tenant
- Setiap sekolah/guru punya ruang data terpisah
- Tenant isolation penuh
- Super admin bisa manage semua tenant

### Admin/Guru
- Dashboard statistik lengkap
- Manajemen Mapel (tambah/edit/hapus)
- Manajemen Kelas (tingkat, jurusan, wali kelas)
- Manajemen Siswa (NIS, email, kelas)
- Manajemen Materi (per mapel & kelas, dengan YouTube & gambar)
- Bank Soal (formatif, sumatif, TKA)
- Tugas Mengamati Video: soal interaktif muncul pada detik tertentu di dalam video, kunci jawaban tersimpan di server
- Exam TKA dengan timer
- Input Nilai per siswa per mapel
- WhatsApp Sender tenant untuk pengingat jadwal pelajaran
- Data seeding otomatis

### Siswa
- Lihat materi per mapel & kelas
- Kerjakan Tugas Video: video tidak bisa dilewati, soal muncul otomatis, jawaban menjadi nilai
- Lihat nilai pribadi
- Ikut Exam TKA dengan timer

### Teknis
- Backend: Node.js + Express
- Database: JSON file (ringan, mudah backup)
- Cache: Redis (dengan fallback in-memory)
- Auth: cookie-session + bcrypt
- WhatsApp: Baileys multi-device; membutuhkan Node.js 20+ dan penyimpanan sesi persisten
- Desain: anti-slop GitHub style

## Instalasi

```bash
cd lms-geografi-multi
npm install
npm start
```

Buka `http://localhost:3000`

## Login

- Admin: email `admin@lms.id` (atau `ADMIN_EMAIL`). Password diambil dari env `ADMIN_PASSWORD`;
  bila tidak diset, password acak dibuat saat seed dan dicetak **sekali** ke stdout.
- Siswa: login memakai **username/email/NIS** (identitas) + **NIS** sebagai password awal (kebijakan sekolah).
  Admin dapat mengganti password siswa lewat `POST /api/students/:id/reset-password`,
  dan siswa/guru dapat mengganti sendiri lewat `POST /api/me/password`.
  ⚠️ Password = NIS mudah ditebak; aktifkan reset berkala bila keamanan jadi prioritas.
- Endpoint mutasi admin (mapel, kelas, siswa, materi, soal, ujian, nilai, presensi, tugas, jadwal)
  hanya untuk role `admin`/`super_admin`.

## Struktur Project

```
lms-geografi-multi/
├── server.js          # Express server + API
├── kurikulum.js       # Modul pembelajaran berjenjang (evaluasi, kunci, naik kelas)
├── video-task.js      # Modul tugas mengamati video (soal bertimestamp, kunci, penilaian)
├── ecosystem.config.js # Konfigurasi PM2 (membaca .env)
├── deploy.sh          # Deploy otomatis: Node.js + PM2 + Nginx
├── cek-deploy.sh      # Pemeriksaan kesehatan hasil deploy
├── .env.example       # Contoh konfigurasi (.env tidak ikut git)
├── package.json       # Dependencies
├── data/
│   ├── db.json        # Database (auto-generated)
│   └── kurikulum/
│       ├── kelas-x/   # 8 bab Fase E (01-02.json … 07-08.json)
│       ├── kelas-xi/  # 8 bab Fase F (01-02.json … 07-08.json)
│       └── kelas-xii/ # belum diisi (kewilayahan Fase F)
└── public/
    ├── index.html     # Login
    ├── admin.html     # Panel admin
    ├── student.html   # Panel siswa
    ├── assets/
    │   ├── css/
    │   │   ├── style.css    # Panel siswa & login
    │   │   ├── login.css
    │   │   ├── admin.css    # Panel admin (flat, responsif)
    │   │   ├── belajar.css  # Pembelajaran berjenjang
    │   │   └── video-task.css # Tugas mengamati video (pemutar + overlay soal)
    │   └── js/
    │       ├── api.js
    │       ├── admin.js
    │       ├── belajar.js
    │       ├── video-task-admin.js # Editor tugas video (admin)
    │       ├── video-task.js       # Pemutar anti-skip + soal interaktif (siswa)
    │       └── student.js
```

## API Endpoints

### Batasan akses siswa
Sesi dengan `role: 'student'` hanya boleh mengakses endpoint berikut (selain itu `403 Forbidden`,
dicek di `requireAuth`):

| Method | Path |
|---|---|
| GET | `/api/me`, `/api/materials`, `/api/exams`, `/api/grades`, `/api/attendance`, `/api/assignments` |
| POST | `/api/grades` (dipaksa ke `student_id` milik sendiri) |
| GET | `/api/kurikulum`, `/api/kurikulum/:babId` |
| GET | `/api/video-tasks`, `/api/video-tasks/:id` |
| POST | `/api/kurikulum/:babId/evaluasi`, `/api/kurikulum/naik-kelas` |
| POST | `/api/video-tasks/:id/attempt` |
| POST | `/api/video-tasks/:id/progress` |
| POST | `/api/auth/presence` (denyut kehadiran untuk Pantauan Server) |

`GET /api/grades` dan `GET /api/attendance` selalu difilter ke data siswa yang login.

### Pantauan Server (admin)
Menu **Pantauan Server** (`GET /api/admin/server-monitor`, admin/super_admin) menampilkan dalam satu
tampilan: siswa terhubung per kelas, jumlah staf online, beban CPU proses, heap Node terhadap batas V8,
memori server, lag event loop, sisa disk, uptime, ukuran & status simpan DB. Data siswa terhubung
dihitung dari `session_logs` dengan jendela `SESSION_ONLINE_MS` (default 120 detik); tab siswa yang
terbuka mengirim `POST /api/auth/presence` tiap 45 detik (berhenti saat tab disembunyikan).
Halaman memuat ulang otomatis tiap 10 detik.

### Auth
- `POST /api/login` - Login (rate limit: 5 gagal / 15 menit per IP+identifier → `429`)
- `POST /api/logout` - Logout
- `GET /api/me` - Current user
- `POST /api/me/password` - Ganti password sendiri (`{ current_password, new_password }`, min 8 karakter)

### Tenants
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create tenant
- `POST /api/tenants/select` - Select tenant

### Subjects
- `GET /api/subjects` - List subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Classes
- `GET /api/classes` - List classes
- `POST /api/classes` - Create class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Students
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `POST /api/students/import` - Impor massal (`{ students: [{ nis, nama, email, no_wa, kelas }] }`)
- `POST /api/students/:id/reset-password` - Reset password satu siswa (password acak dikembalikan sekali)
- `POST /api/students/reset-passwords` - Reset massal (`{ class_id? }`), mengembalikan daftar kredensial

### Impor Siswa (CSV)
Menu **Siswa** → **Template** untuk mengunduh `template-siswa.csv`, isi lalu **Impor**.
Kolom: `nis,nama,email,no_wa,kelas` (`email` & `no_wa` opsional; `kelas` harus sama dengan nama kelas yang ada).
Nomor WA dinormalkan ke format `62…` saat disimpan (untuk notifikasi).

### Materials
- `GET /api/materials` - List materials (siswa: hanya tingkat/kelasnya & semester aktif)
- `POST /api/materials` - Create material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material
- `POST /api/admin/kurikulum/seed-materials` - Impor semua bab kurikulum menjadi materi biasa

Menu **Materi** di panel admin punya tombol **Impor Kurikulum**: menyalin setiap bab Kelas X/XI/XII menjadi satu materi (judul `Bab n. …`, kolom modul `X-01 · Fase E · 4 JP`, konten gabungan ringkasan + tujuan + sub-materi + glosarium). Bab dipetakan ke kelas berdasarkan `tingkat` kelas (`X` → kelas X-A, `XI` → XI-B); kelas yang belum ada dilewati dan dilaporkan. Impor ulang memperbarui bab yang sama (ditandai `sumber: "kurikulum"` + `bab_id`) tanpa membuat duplikat. Setelah diimpor, materi dapat diedit/dihapus seperti materi biasa.

### Questions
- `GET /api/questions` - List questions
- `POST /api/questions` - Create question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question

### Exams
- `GET /api/exams` - List exams (siswa: hanya kelasnya, soal tanpa kunci jawaban)
- `POST /api/exams` - Create exam
- `DELETE /api/exams/:id` - Delete exam
- `POST /api/exams/:id/submit` - Siswa kirim jawaban; nilai dihitung di server

### Grades
- `GET /api/grades` - List grades (siswa: hanya miliknya)
- `POST /api/grades` - Create grade (admin/guru)
- `PUT /api/grades/:id` - Update grade
- `DELETE /api/grades/:id` - Delete grade

### Tugas Mengamati Video
Siswa menonton video YouTube di pemutar tanpa kontrol bawaan. Posisi tonton dikunci
(`seek` ke depan dikembalikan ke posisi terakhir), soal muncul saat detik yang
ditentukan tercapai dan video berhenti sampai jawaban disimpan.

- `GET /api/video-tasks` - Daftar tugas untuk kelas siswa (tanpa kunci jawaban)
- `GET /api/video-tasks/:id` - Detail tugas + soal (tanpa `kunci`/pembahasan)
- `POST /api/video-tasks/:id/attempt` - Kirim jawaban; ditolak `400` bila ada soal
  belum dijawab atau `watched_seconds`/`position` belum mencapai batas tonton
- `POST /api/video-tasks/:id/progress` - Catat progres menonton (`watched_seconds`,
  `position`); disimpan maksimum per siswa di `video_progress` dan dipakai rekap
- `GET /api/admin/video-tasks` - Daftar tugas + rekap (admin/guru)
- `POST/PUT/DELETE /api/admin/video-tasks[/:id]` - Kelola tugas, soal, dan kunci jawaban
- `GET /api/admin/video-tasks/:id/hasil` - Nilai terbaik dan riwayat percobaan per siswa,
  termasuk `watch_percent` dan status `sudah`/`menonton`/`belum` (`ringkasan` berisi hitungannya)

Soal mendukung dua tipe: `pg` (pilihan ganda) dan `uraian` (esai HOTS). Soal uraian menyimpan
`kunci_uraian` + `kata_kunci` yang tidak pernah dikirim ke browser sebelum jawaban dikumpulkan.
Penilaian otomatis: **50% kemiripan** kata/frasa dengan kunci acuan + **50% relevansi** kata kunci
(kata kunci frasa mendapat kredit proporsional), dengan penalti untuk jawaban di bawah 8 kata.
Respons hasil memuat `kemiripan`, `relevansi`, `poin`, serta daftar kata kunci yang belum muncul.

Nilai terbaik percobaan juga muncul di `GET /api/grades` dengan `tipe: 'Tugas Video'`.

Modal **Hasil** pada admin menampilkan rekap per siswa (nama + kelas) dengan filter kelas,
status mengerjakan (termasuk **sedang menonton**), dan nilai, kolom **Progres Tonton**
(persentase video yang sudah ditonton), serta tombol **Cetak Laporan**.

Contoh tugas siap pakai (video Watchdoc "Karhutla Tiga Dekade", 15 soal HOTS):
`npm run seed:video-task` — tambahkan `-- --class "X E 6"` untuk membatasi kelas, atau
`-- --force` untuk memperbarui. Tanpa `--class`, tugas tampil untuk semua kelas.

Contoh tugas kedua (video Animal Scripts "Hutan Kalimantan: Lebih Purba dari Amazon", 30 soal:
24 analisis pilihan ganda + 6 uraian):
`npm run seed:video-task-hutan` — opsi `-- --class "XI F 1"` dan `-- --force` sama seperti di atas.

### Dashboard
- `GET /api/dashboard` - Dashboard stats

### Seed
- `POST /api/seed` - Initialize sample data

## Deploy ke VPS

Target skrip `deploy.sh`: Debian 12 / Ubuntu 22.04+, Node.js 20, PM2, Nginx. Skrip ini menyiapkan VPS baru/mandiri dan tidak boleh dijalankan begitu saja pada container Proxmox yang memakai konfigurasi jaringan atau reverse proxy berbeda.

```bash
# di server, sebagai root
git clone https://github.com/wsejagad-arch/lms-geografi.git /root/lms-geografi
cd /root/lms-geografi
bash deploy.sh
```

`deploy.sh` bersifat idempoten: memasang paket & Node.js bila belum ada, menarik `main`, `npm ci --omit=dev`, membuat `.env` (dengan `SESSION_SECRET` acak) hanya bila belum ada, menjalankan PM2 + startup systemd, menulis konfigurasi Nginx (real IP Cloudflare, gzip, security header, cache `/assets`), lalu memverifikasi HTTP.

Variabel yang bisa di-override:

```bash
DOMAIN=geolabs.my.id PORT=3000 ENABLE_TLS=1 EMAIL=admin@geolabs.my.id bash deploy.sh
```

Untuk sekaligus menambahkan tugas video contoh (15 soal HOTS) ke database server:

```bash
SEED_VIDEO_TASK=1 bash deploy.sh
```

| Variabel | Default | Fungsi |
|---|---|---|
| `DOMAIN` | `geolabs.my.id` | `server_name` Nginx |
| `APP_DIR` | `/var/www/lms-geografi` | lokasi aplikasi |
| `PORT` | `3000` | port aplikasi (di-proxy Nginx) |
| `REPO` / `BRANCH` | repo GitHub / `main` | sumber kode |
| `ENABLE_TLS` | `0` | `1` = certbot Let's Encrypt; `0` = Cloudflare Full (strict) |

Setelah deploy: arahkan DNS `geolabs.my.id` ke IP server, nyalakan proxy Cloudflare, dan set SSL/TLS ke **Full (strict)** (pasang Cloudflare Origin Certificate di Nginx, atau jalankan ulang dengan `ENABLE_TLS=1`).

### Konfigurasi `.env`

Disalin dari `.env.example`, mode `600`, tidak ikut git.

| Kunci | Wajib | Keterangan |
|---|---|---|
| `PORT` | ya | port aplikasi |
| `SESSION_SECRET` | ya | kunci penandatangan cookie sesi; `openssl rand -hex 32`; beberapa kunci dipisah koma untuk rotasi |
| `REDIS_HOST` / `REDIS_PORT` | tidak | tanpa Redis dipakai cache in-memory |
| `NODE_ENV` | tidak | `production` |
| `PUBLIC_APP_URL` | dianjurkan | URL publik LMS, dapat dioverride per tenant di panel WhatsApp |
| `WA_SESSION_DIR` | tidak | direktori privat dan persisten untuk kredensial WhatsApp |
| `WA_TIME_ZONE` | tidak | zona jadwal kirim; default `Asia/Jakarta` |

### WhatsApp Sender

Admin tenant dapat menautkan nomor khusus dengan QR, memilih grup, lalu menjadwalkan pengingat satu kali untuk jadwal pelajaran. Scheduler memakai zona waktu WIB, mencegah duplikasi jadwal/grup/tanggal, membatasi maksimal 100 pesan per tenant per hari, dan tidak mengulang pengiriman yang gagal secara otomatis.

Panel admin juga menyediakan pencarian grup (filter nama), pemeriksaan nomor WhatsApp (`POST /api/admin/whatsapp/verify-number`), dan **pengingat otomatis per kelas** (`POST /api/admin/whatsapp/auto`): memilih satu kelas membuat satu job per jadwal kelas tersebut, lalu scheduler mengirim setiap pekan pada hari dan jam pelajaran terkait. Setiap job otomatis hanya dikirim sekali per tanggal; kegagalan dicatat di `last_error` tanpa mengulang di hari yang sama.

Koneksi grup menggunakan protokol WhatsApp Web tidak resmi (Baileys), bukan WhatsApp Business Cloud API. Penggunaan dapat bertentangan dengan ketentuan WhatsApp atau menyebabkan nomor dibatasi; gunakan nomor yang dikelola sekolah dan hanya kirim ke grup yang menyetujui pengingat. Kredensial sesi harus tetap privat dan persisten. Jalankan satu instance aplikasi agar scheduler tidak mengirim pesan ganda.

### Update & rollback

```bash
bash deploy.sh          # tarik kode terbaru + reload PM2
pm2 logs lms-geografi   # pantau log
```

`data/db.json` di-gitignore sehingga tidak tersentuh `git reset --hard`; tetap buat backup sebelum update besar.

### Pemeriksaan kesehatan

```bash
bash cek-deploy.sh geolabs.my.id
```

Memeriksa nginx, status PM2, berkas & izin `.env`, `SESSION_SECRET` bukan default, port, HTTP aplikasi (`/` 200, `/api/me` 401), respons lewat Nginx, masa berlaku sertifikat TLS, ukuran `db.json` + backup, dan pemakaian disk. Keluar dengan kode 1 bila ada temuan.

## Redis

Opsional, untuk cache. Install Redis:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl enable redis-server
```

Atau set environment variable:
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Hitungan limiter login (`login-fail:*`) otomatis dibersihkan setiap proses start dan
setiap Redis reconnect, jadi kunci "Terlalu banyak percobaan" tidak bertahan setelah
aplikasi dibuka kembali. Set `LMS_REDIS_FLUSH_ON_START=1` bila ingin menghapus seluruh
cache Redis saat start.

## Kurikulum Berjenjang (Geografi Kelas X dan XI)

Materi disusun berjenjang per kelas: siswa hanya bisa membuka bab berikutnya setelah bab sebelumnya **tuntas** (nilai ≥ KKM 75). Setiap bab punya evaluasi dengan **maksimal 3 percobaan**; yang diambil adalah **nilai tertinggi**. Setelah semua bab tuntas, tombol **Naik Kelas** membuka jenjang berikutnya.

### Landasan regulasi (terverifikasi)
| Regulasi | Pokok |
|---|---|
| Permendikbudristek No. 12 Tahun 2024 | Kurikulum PAUD/Dikdas/Dikmen (induk) |
| Permendikdasmen No. 13 Tahun 2025 | Penyesuaian kurikulum; kelas X memakai **IPS terpadu** (288 JP), Geografi mandiri di Fase F (5 JP/minggu) |
| Kepka BSKAP No. 046/H/KR/2025 | Capaian Pembelajaran terbaru (Fase E & F) |
| Kepka BKPDM No. 020 Tahun 2026 | Perubahan atas CP 046/H/KR/2025 |
| Kepmendikdasmen No. 126/P/2025 | Pedoman Implementasi Pembelajaran Mendalam |
| Panduan Pembelajaran dan Asesmen, Revisi 2025 | Acuan CP → TP → ATP (ATP disusun guru, tidak ada ATP nasional per mapel) |

Catatan: pada CP 2025, Fase E (kelas X) dirumuskan dalam CP IPS; sekolah boleh mengorganisasi muatan **per disiplin**. Karena itu Geografi kelas X di LMS ini disusun sebagai pengorganisasian disiplin dari CP Fase E, dan pedosfer/antroposfer ditempatkan sebagai pengayaan menuju Fase F.

### Isi materi Kelas X (`data/kurikulum/kelas-x/`)
| Urutan | Bab | Fokus |
|---|---|---|
| 1 | Konsep, Prinsip, dan Pendekatan Geografi | objek studi, 10 konsep, korologi |
| 2 | Peta, Skala, Proyeksi, dan Membaca Ruang | skala, distorsi, kontur, kemiringan lereng |
| 3 | Penginderaan Jauh dan Interpretasi Citra | sensor, resolusi, 9 unsur interpretasi |
| 4 | Sistem Informasi Geografis | vektor/raster, overlay, buffer, WebGIS |
| 5 | Litosfer: Batuan, Tektonika, Bahaya Geologis | siklus batuan, lempeng, gempa, amplifikasi |
| 6 | Atmosfer: Cuaca, Iklim, Perubahan Iklim | lapisan, ENSO, monsun, adaptasi |
| 7 | Hidrosfer: Siklus Air, DAS, Dinamika Laut | neraca air, intrusi air laut, pesisir |
| 8 | Mitigasi Bencana dan Tata Ruang Berbasis Risiko | rumus risiko, levee effect, rencana aksi |

Setiap bab memuat: tujuan pembelajaran, 4 sub-materi, glosarium, dan **5 soal** yang mencakup lima tipe — pilihan ganda majemuk, pilihan ganda, pilihan ganda kompleks, menjodohkan, dan benar–salah. Semua soal memakai stimulus literasi (paragraf/poster) dan/atau numerasi (tabel & perhitungan), berlevel C3–C5, dengan pembahasan.

Kolom **URL video stimulus (YouTube)** pada editor soal menempelkan video ke stimulus soal mana pun tanpa menambah tipe soal baru. Server hanya menyimpan id 11 karakter (`stimulus.youtube_id`) dari tautan `youtu.be`, `watch?v=`, `shorts`, `embed`, atau `live`; tautan non-YouTube ditolak `400`. Video tampil di atas bacaan saat siswa membuka evaluasi materi.

### Isi materi Kelas XI (`data/kurikulum/kelas-xi/`)
Kelas XI memakai **Fase F** dan melanjutkan jenjang setelah seluruh bab Kelas X tuntas (nilai ≥ KKM). Fokusnya biosfer, antroposfer, interaksi manusia–lingkungan, dan sumber daya alam.

| Urutan | Bab | Fokus |
|---|---|---|
| 1 | Biosfer: Sebaran Flora dan Fauna Indonesia dan Dunia | faktor persebaran, bioma, garis Wallace–Webber, konservasi |
| 2 | Tanah: Pembentukan, Klasifikasi, dan Degradasi | lima faktor tanah, jenis tanah Indonesia, USLE, konservasi |
| 3 | Antroposfer: Dinamika Penduduk dan Proyeksi | CBR/CDR, migrasi, piramida, rasio ketergantungan |
| 4 | Kualitas Penduduk: Pendidikan, Kesehatan, Ketenagakerjaan | IPM, APK/APM, stunting, TPT dan produktivitas |
| 5 | Keragaman Budaya dan Difusi Inovasi | unsur budaya, persebaran bahasa, difusi, glokalisasi |
| 6 | Interaksi Manusia dan Lingkungan | daya dukung, jejak ekologis, kearifan lokal |
| 7 | Sumber Daya Alam: Klasifikasi, Sebaran, Konsumsi | umur cadangan, sebaran komoditas, transisi energi |
| 8 | Kajian Lingkungan Berkelanjutan: Proyek Mini | indikator, data lapangan, analisis, rekomendasi |

Struktur tiap bab sama dengan Kelas X (tujuan, 4 sub-materi, glosarium, 5 soal lima tipe, level C3–C5). Kelas XII (kewilayahan: pusat pertumbuhan, tata ruang, interaksi desa–kota, globalisasi) belum diisi dan akan memakai format yang sama.

### Endpoint
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/kurikulum` | daftar bab + progres + status kunci |
| GET | `/api/kurikulum/:babId` | materi + soal (tanpa kunci) |
| POST | `/api/kurikulum/:babId/evaluasi` | nilai otomatis, simpan percobaan (maks 3) |
| POST | `/api/kurikulum/naik-kelas` | naik jenjang bila semua bab tuntas |
| GET | `/api/admin/kurikulum/progress` | rekap progres seluruh siswa |
| POST | `/api/admin/kurikulum/seed-materials` | impor bab menjadi materi biasa (idempoten) |

Aturan penilaian: PG/PGM dinilai 1 atau 0; PG kompleks harus sama persis dengan kunci; benar–salah dan menjodohkan diberi poin proporsional. Nilai akhir = (total poin ÷ jumlah soal) × 100.

## Backup

```bash
cp data/db.json data/db.json.backup
```

Pemulihan lewat API (khusus `super_admin`, membuat backup otomatis sebelum menulis):

```bash
curl -b cookies.txt -X POST https://<domain>/api/admin/restore \
  -H 'Content-Type: application/json' \
  --data-binary @restore.json   # {"confirm":"RESTORE","data":{...isi db.json...}}
```

Akun `admin`/`super_admin` yang sedang ada selalu dipertahankan agar akses tidak hilang.


## Referensi

Perancangan materi & asesmen:
- Permendikbudristek No. 12 Tahun 2024; Permendikdasmen No. 13 Tahun 2025
- Kepka BSKAP No. 046/H/KR/2025; Kepka BKPDM No. 020 Tahun 2026
- Kepmendikdasmen No. 126/P/2025; Panduan Pembelajaran dan Asesmen (Revisi 2025)
- Daftar resmi: https://kurikulum.kemendikdasmen.go.id/rujukan/regulasi-kurikulum

Stimulus isu aktual dirujuk dari BMKG, Badan Geologi/ESDM, Kementerian Lingkungan Hidup, dan BPS (2025–2026); angka pada soal bersifat ilustratif untuk latihan, bukan data resmi.

Desain antarmuka mengikuti prinsip minimal: tanpa gradient, radius kecil, shadow minimal, warna netral, dan system font.

## Tool Browser (MCP) � uji live tanpa buka tab manual

`scripts/browser-mcp.mjs` adalah MCP server (stdio) yang mengendalikan Chrome/Edge lewat
Chrome DevTools Protocol. **Tanpa dependensi npm** (butuh Node >= 22 dan Chrome/Edge terpasang).

Terdaftar di `.vscode/mcp.json` sebagai server `browser` (restart MCP / reload window setelah mengubah config).

| Tool | Fungsi |
|---|---|
| `browser_start` | jalankan Chrome (headless default; `headless:false` untuk lihat jendela) |
| `browser_goto` | buka URL + tunggu DOM siap (kembalikan url/title) |
| `browser_eval` | jalankan JS di halaman, hasil dikembalikan sebagai JSON |
| `browser_click` | klik elemen (selector CSS, opsional `index`) |
| `browser_fill` | isi input/select + dispatch `input`/`change`, opsional `submit` form |
| `browser_wait` | tunggu selector / ekspresi JS truthy |
| `browser_text` / `browser_html` | ambil innerText / outerHTML |
| `browser_screenshot` | simpan PNG (full page / potong selector) |
| `browser_viewport` | ubah width/height, mode `mobile` (meta viewport otomatis disisipkan) |
| `browser_console` | log & error halaman |
| `browser_network` | request gagal / status >= 400 |
| `browser_status` / `browser_close` | status proses & tutup browser |

Contoh alur di chat:

```
browser_start
browser_goto  url=https://geolabs.my.id/student.html
browser_fill  selector=#email value=6087
browser_fill  selector=#password value=6087 submit=true
browser_wait  selector=.nav-item
browser_click selector=[data-nav="belajar"]
browser_click selector="#bl-eval input[type=radio]"
browser_click selector=#bl-submit
browser_text  selector=#bl-eval .bl-score
browser_screenshot path=C:/tmp/hasil.png
```

Env: `BROWSER_HEADLESS` (1/0), `BROWSER_PORT` (default 9333), `BROWSER_TIMEOUT_MS`,
`BROWSER_EXECUTABLE` (path chrome/edge bila tidak terdeteksi).

Uji mandiri: `npm run test:browser` (15 check: start/goto/fill/click/wait/eval/viewport
mobile/screenshot/console/network/status/close). E2E aplikasi: `npm run test:e2e`.

## Lupa Password Admin / Terkunci Rate Limit

Hash password disimpan dengan bcrypt dan **tidak bisa dibaca balik**, jadi password lama
tidak dapat ditampilkan. Ganti lewat skrip di server:

```bash
cd /opt/lms-geografi
node scripts/reset-admin-password.mjs --list            # lihat akun admin
node scripts/reset-admin-password.mjs                   # password acak, dicetak sekali
node scripts/reset-admin-password.mjs --password 'RahasiaBaru123'
node scripts/reset-admin-password.mjs --email admin@lms.id --promote   # buat bila belum ada
pm2 restart lms --update-env
```

Backup `data/db.json` dibuat otomatis sebelum menulis. Setelah login, ganti password
lewat `POST /api/me/password`.

### Akun guru

Akun guru (role `teacher`) hanya melihat menu **Jurnal Mengajar** di panel admin dan
boleh mengisi/memperbaiki jurnal serta presensi kelas.

```bash
cd /opt/lms-geografi
node scripts/create-teacher.mjs --list                       # lihat akun non-siswa
node scripts/create-teacher.mjs --email guru@sekolah.id --nama "Nama Guru"
node scripts/create-teacher.mjs --email guru2@sekolah.id --password 'RahasiaBaru123'
pm2 restart lms --update-env
```

**Terkunci "Terlalu banyak percobaan…"** – limiter login menyimpan hitungan di Redis
bila tersedia, atau di memori proses bila tidak. Hitungan di Redis kini dibersihkan
otomatis saat start/reconnect; tanpa Redis, cukup restart proses:

```bash
pm2 restart lms --update-env      # menghapus hitungan lockout in-memory
```

Atau tunggu sesuai `Retry-After` (default 15 menit, atur via `LOGIN_WINDOW_MS`).
