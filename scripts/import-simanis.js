// Impor data kelas, siswa, dan jadwal dari SIMANIS ke data/db.json
// Pemakaian: node scripts/import-simanis.js <payload.json>
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const payloadPath = process.argv[2];

if (!payloadPath) {
  console.error('Payload path wajib: node scripts/import-simanis.js <payload.json>');
  process.exit(1);
}

const GURU = 'DWI WAHYU MUKTIONO, S. Pd.';

// "Senin", "07:45", "09:15", kelas
const JADWAL = [
  ['Senin', '07:45', '09:15', 'XI F 1'],
  ['Senin', '11:00', '13:10', 'XI F 3'],
  ['Senin', '13:10', '15:25', 'X E 8'],
  ['Selasa', '09:15', '11:45', 'XI F 1'],
  ['Selasa', '13:10', '15:25', 'XI F 4'],
  ['Rabu', '08:30', '11:00', 'X E 7'],
  ['Rabu', '11:00', '13:55', 'XI F 3'],
  ['Kamis', '07:00', '08:30', 'XI F 4'],
  ['Jumat', '09:15', '11:45', 'X E 6'],
];

const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const tenant = db.tenants[0];
const subject = db.subjects.find(s => s.tenant_id === tenant.id && /geografi/i.test(s.nama));
const admin = db.users.find(u => u.role === 'super_admin') || db.users[0];
const now = new Date().toISOString();

const stats = { classes: 0, students: 0, skipped: 0, schedules: 0 };

function pickWali(rows) {
  const counts = new Map();
  rows.forEach(r => {
    const w = (r.wali || '').trim();
    if (w) counts.set(w, (counts.get(w) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

const classIdByName = new Map();

for (const [namaKelas, rows] of Object.entries(payload)) {
  const [tingkat, jurusan] = namaKelas.split(' ');
  let kelas = db.classes.find(
    c => c.tenant_id === tenant.id && String(c.nama).trim().toLowerCase() === namaKelas.toLowerCase()
  );

  if (!kelas) {
    kelas = {
      id: randomUUID(),
      tenant_id: tenant.id,
      nama: namaKelas,
      tingkat,
      jurusan,
      wali_kelas: pickWali(rows),
      created_by: admin.id,
      created_at: now,
    };
    db.classes.push(kelas);
    stats.classes++;
  } else if (!kelas.wali_kelas) {
    kelas.wali_kelas = pickWali(rows);
  }

  classIdByName.set(namaKelas, kelas.id);

  for (const s of rows) {
    const nis = String(s.induk || '').trim();
    const nama = String(s.nama || '').trim();
    if (!nis || !nama) continue;

    const exists = db.students.some(
      st => st.tenant_id === tenant.id && String(st.nis || '').trim() === nis
    );
    if (exists) {
      stats.skipped++;
      continue;
    }

    db.students.push({
      id: randomUUID(),
      tenant_id: tenant.id,
      nama,
      nis,
      nisn: s.nisn || '',
      email: '',
      no_wa: s.wa || '',
      class_id: kelas.id,
      username: nis,
      password: bcrypt.hashSync(nis, 10),
      created_by: admin.id,
      created_at: now,
    });
    stats.students++;
  }
}

if (!subject) {
  console.error('Mapel Geografi tidak ditemukan; jadwal dilewati.');
} else {
  for (const [hari, mulai, selesai, namaKelas] of JADWAL) {
    const classId = classIdByName.get(namaKelas);
    if (!classId) continue;

    const exists = db.schedules.some(
      sc =>
        sc.tenant_id === tenant.id &&
        sc.hari === hari &&
        sc.jam_mulai === mulai &&
        sc.class_id === classId
    );
    if (exists) continue;

    db.schedules.push({
      id: randomUUID(),
      tenant_id: tenant.id,
      hari,
      jam_mulai: mulai,
      jam_selesai: selesai,
      subject_id: subject.id,
      class_id: classId,
      ruangan: '',
      guru: GURU,
      created_by: admin.id,
      created_at: now,
    });
    stats.schedules++;
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(JSON.stringify(stats));
