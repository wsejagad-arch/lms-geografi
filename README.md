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
├── package.json       # Dependencies
├── data/
│   └── db.json        # Database (auto-generated)
└── public/
    ├── index.html     # Login
    ├── admin.html     # Panel admin
    ├── student.html   # Panel siswa
    ├── assets/
    │   ├── css/
    │   │   ├── style.css    # Panel siswa & login
    │   │   ├── login.css
    │   │   └── admin.css    # Panel admin (flat, responsif)
    │   └── js/
    │       ├── api.js
    │       ├── admin.js
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

## Backup

```bash
cp data/db.json data/db.json.backup
```

## Referensi

Desain mengikuti prinsip anti-slop dari GitHub:
- Tanpa gradient
- Border-radius maksimal 6px
- Shadow minimal
- Neutral colors
- System fonts
