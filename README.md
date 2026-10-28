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
- Exam TKA dengan timer
- Input Nilai per siswa per mapel
- Data seeding otomatis

### Siswa
- Lihat materi per mapel & kelas
- Lihat nilai pribadi
- Ikut Exam TKA dengan timer

### Teknis
- Backend: Node.js + Express
- Database: JSON file (ringan, mudah backup)
- Cache: Redis (dengan fallback in-memory)
- Auth: cookie-session + bcrypt
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
- Siswa: password dibuat acak saat siswa dibuat/diimpor (dikembalikan di respons API), bukan NIS.
- Endpoint mutasi admin (mapel, kelas, siswa, materi, soal, ujian, nilai, presensi, tugas, jadwal)
  hanya untuk role `admin`/`super_admin`.

## Struktur Project

```
lms-geografi-multi/
├── server.js          # Express server + API
├── kurikulum.js       # Modul pembelajaran berjenjang (evaluasi, kunci, naik kelas)
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
    │   │   └── belajar.css  # Pembelajaran berjenjang
    │   └── js/
    │       ├── api.js
    │       ├── admin.js
    │       ├── belajar.js
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
| POST | `/api/kurikulum/:babId/evaluasi`, `/api/kurikulum/naik-kelas` |

`GET /api/grades` dan `GET /api/attendance` selalu difilter ke data siswa yang login.

### Auth
- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/me` - Current user

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

### Dashboard
- `GET /api/dashboard` - Dashboard stats

### Seed
- `POST /api/seed` - Initialize sample data

## Deploy ke VPS (geolabs.my.id)

Target: Debian 12 / Ubuntu 22.04+, Node.js 20, PM2, Nginx di belakang Cloudflare.

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

## Referensi

Perancangan materi & asesmen:
- Permendikbudristek No. 12 Tahun 2024; Permendikdasmen No. 13 Tahun 2025
- Kepka BSKAP No. 046/H/KR/2025; Kepka BKPDM No. 020 Tahun 2026
- Kepmendikdasmen No. 126/P/2025; Panduan Pembelajaran dan Asesmen (Revisi 2025)
- Daftar resmi: https://kurikulum.kemendikdasmen.go.id/rujukan/regulasi-kurikulum

Stimulus isu aktual dirujuk dari BMKG, Badan Geologi/ESDM, Kementerian Lingkungan Hidup, dan BPS (2025–2026); angka pada soal bersifat ilustratif untuk latihan, bukan data resmi.

Desain antarmuka mengikuti prinsip minimal: tanpa gradient, radius kecil, shadow minimal, warna netral, dan system font.
