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

