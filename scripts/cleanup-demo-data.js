// Hapus data contoh (kelas X-A, XI-B, XII-A beserta turunannya) dan set identitas tenant.
// Pemakaian: node scripts/cleanup-demo-data.js
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const DEMO_CLASSES = new Set(['X-A', 'XI-B', 'XII-A']);

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const demoClassIds = new Set(
  db.classes.filter(c => DEMO_CLASSES.has(String(c.nama).trim())).map(c => c.id)
);
const demoStudentIds = new Set(
  db.students.filter(s => demoClassIds.has(s.class_id)).map(s => s.id)
);

const removed = {};
const drop = (table, predicate) => {
  if (!Array.isArray(db[table])) return;
  const before = db[table].length;
  db[table] = db[table].filter(row => !predicate(row));
  removed[table] = before - db[table].length;
};

drop('classes', c => demoClassIds.has(c.id));
drop('students', s => demoStudentIds.has(s.id) || demoClassIds.has(s.class_id));
drop('schedules', s => demoClassIds.has(s.class_id));
drop('assignments', a => demoClassIds.has(a.class_id));
drop('attendance', a => demoClassIds.has(a.kelas_id) || demoStudentIds.has(a.student_id));
drop('exams', e => demoClassIds.has(e.class_id));
drop('grades', g => demoClassIds.has(g.class_id) || demoStudentIds.has(g.student_id));
drop('progress', p => demoStudentIds.has(p.student_id));
drop('attempts', a => demoStudentIds.has(a.student_id));

for (const tenant of db.tenants) {
  if (tenant.slug === 'sman1-jakarta') {
    tenant.nama = 'SMA Negeri 1 Sumber';
    tenant.slug = 'sman1-sumber';
    tenant.description = 'LMS Geografi SMA Negeri 1 Sumber';
  }
  tenant.semester_aktif = 1;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(JSON.stringify(removed));
