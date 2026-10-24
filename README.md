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

- Admin: `admin@lms.id` / `admin`

## Struktur Project

```
lms-geografi-multi/
├── server.js          # Express server + API
├── kurikulum.js       # Modul pembelajaran berjenjang (evaluasi, kunci, naik kelas)
├── package.json       # Dependencies
├── data/
│   ├── db.json        # Database (auto-generated)
│   └── kurikulum/
│       ├── kelas-x/   # Konten JSON per bab (01-02.json … 07-08.json)
│       ├── kelas-xi/
│       └── kelas-xii/
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
- `GET /api/materials` - List materials
- `POST /api/materials` - Create material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material

### Questions
- `GET /api/questions` - List questions
- `POST /api/questions` - Create question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question

### Exams
- `GET /api/exams` - List exams
- `POST /api/exams` - Create exam
- `DELETE /api/exams/:id` - Delete exam

### Grades
- `GET /api/grades` - List grades
- `POST /api/grades` - Create grade
- `PUT /api/grades/:id` - Update grade
- `DELETE /api/grades/:id` - Delete grade

### Dashboard
- `GET /api/dashboard` - Dashboard stats

### Seed
- `POST /api/seed` - Initialize sample data

## Deploy ke VPS

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start server.js --name lms-geografi-multi
pm2 save
pm2 startup
```

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

## Kurikulum Berjenjang (Geografi Kelas X)

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

### Endpoint
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/kurikulum` | daftar bab + progres + status kunci |
| GET | `/api/kurikulum/:babId` | materi + soal (tanpa kunci) |
| POST | `/api/kurikulum/:babId/evaluasi` | nilai otomatis, simpan percobaan (maks 3) |
| POST | `/api/kurikulum/naik-kelas` | naik jenjang bila semua bab tuntas |
| GET | `/api/admin/kurikulum/progress` | rekap progres seluruh siswa |

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
