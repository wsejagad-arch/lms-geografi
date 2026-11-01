import assert from 'node:assert/strict';
import whatsapp from '../whatsapp-sender.js';

const local = whatsapp.currentLocalDateTime(new Date('2026-11-02T00:00:00.000Z'));
assert.deepEqual(local, { date: '2026-11-02', time: '07:00' });
console.log('PASS  jadwal dikonversi ke zona WIB');

const db = {
  grades: [
    { tenant_id: 't1', class_id: 'c1', student_id: 's1', nilai: 80 },
    { tenant_id: 't1', class_id: 'c1', student_id: 's1', nilai: 100 },
    { tenant_id: 't1', class_id: 'c1', student_id: 's2', nilai: 70 },
    { tenant_id: 't1', class_id: 'c1', student_id: 's3', nilai: null },
    { tenant_id: 't2', class_id: 'c1', student_id: 's4', nilai: 100 }
  ],
  classes: [{ id: 'c1', tenant_id: 't1', nama: 'XI F 4' }],
  subjects: [{ id: 'g1', tenant_id: 't1', nama: 'Geografi' }]
};
assert.equal(whatsapp.averageClassScore(db, 't1', 'c1'), 80);
console.log('PASS  rata-rata kelas menghitung rata-rata per siswa dan membatasi tenant');

const message = whatsapp.createReminderMessage(db, {
  id: 't1',
  whatsapp_sender: { lms_url: 'https://geo.example.id' }
}, {}, {
  class_id: 'c1',
  subject_id: 'g1',
  hari: 'Senin',
  jam_mulai: '07:00',
  jam_selesai: '08:30'
});
assert.match(message, /Ayo selesaikan materi dan evaluasi LMS/);
assert.match(message, /Rata-rata nilai kelas: 80/);
assert.match(message, /Buka LMS: https:\/\/geo\.example\.id/);
console.log('PASS  pengingat memuat jadwal, rata-rata kelas, dan tautan tenant');

assert.equal(whatsapp.normalizeDay('Senin'), 'senin');
assert.equal(whatsapp.normalizePhone('081234567890'), '6281234567890');
assert.equal(whatsapp.normalizePhone('+62 812-3456-7890'), '6281234567890');
assert.equal(whatsapp.normalizePhone('6281234567890'), '6281234567890');
assert.equal(whatsapp.normalizePhone('81234567890'), '6281234567890');
assert.equal(whatsapp.normalizePhone('12345'), '');
console.log('PASS  normalisasi nomor WhatsApp 08/+62/62/8');
assert.equal(whatsapp.normalizeDay(' jumat '), 'jumat');
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
assert.equal(whatsapp.weekdayName('2026-11-02'), dayNames[new Date('2026-11-02T00:00:00+07:00').getDay()]);
console.log('PASS  nama hari WIB dan normalisasi hari konsisten');

// Pengingat otomatis: hanya jalan pada hari yang sama, sekali per tanggal, dan
// mencatat kegagalan bila WhatsApp belum terhubung.
const fs = await import('node:fs/promises');
const os = await import('node:os');
const path = await import('node:path');
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-auto-'));
const dbPath = path.join(dir, 'db.json');
const today = whatsapp.weekdayName(whatsapp.currentLocalDateTime().date);
const otherDay = today === 'Senin' ? 'Selasa' : 'Senin';
const autoDb = {
  tenants: [{ id: 't1', whatsapp_sender: { enabled: true, lms_url: 'https://geo.example.id' } }],
  classes: [{ id: 'c1', tenant_id: 't1', nama: 'XI F 4' }],
  subjects: [{ id: 'g1', tenant_id: 't1', nama: 'Geografi' }],
  grades: [],
  schedules: [
    { id: 'sc1', tenant_id: 't1', class_id: 'c1', subject_id: 'g1', hari: today, jam_mulai: '00:00', jam_selesai: '01:00' },
    { id: 'sc2', tenant_id: 't1', class_id: 'c1', subject_id: 'g1', hari: otherDay, jam_mulai: '00:00', jam_selesai: '01:00' }
  ],
  whatsapp_jobs: [
    { id: 'j1', tenant_id: 't1', mode: 'auto', status: 'active', schedule_id: 'sc1', group_id: '120363000000000000@g.us', last_sent_date: '' },
    { id: 'j2', tenant_id: 't1', mode: 'auto', status: 'active', schedule_id: 'sc2', group_id: '120363000000000000@g.us', last_sent_date: '' }
  ]
};
const loadDB = async () => JSON.parse(await fs.readFile(dbPath, 'utf8'));
const saveDB = async data => fs.writeFile(dbPath, JSON.stringify(data));
await saveDB(autoDb);
await whatsapp.processAutoJobs(loadDB, saveDB, whatsapp.currentLocalDateTime());
const afterAuto = await loadDB();
const jobToday = afterAuto.whatsapp_jobs.find(job => job.id === 'j1');
const jobOther = afterAuto.whatsapp_jobs.find(job => job.id === 'j2');
assert.equal(jobToday.last_sent_date, whatsapp.currentLocalDateTime().date);
assert.match(jobToday.last_error, /belum terhubung/);
assert.equal(jobOther.last_sent_date, '');
await fs.rm(dir, { recursive: true, force: true });
console.log('PASS  pengingat otomatis hanya diproses pada hari jadwal dan mencatat kegagalan');

