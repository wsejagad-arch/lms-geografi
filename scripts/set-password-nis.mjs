#!/usr/bin/env node
// Samakan password siswa menjadi NIS (kebijakan sekolah).
// Jalankan di server aplikasi:
//   node scripts/set-password-nis.mjs            (dry-run, hanya laporan)
//   node scripts/set-password-nis.mjs --apply    (tulis + backup otomatis)
//
// Opsi:
//   --nis 6082,6083      hanya NIS tertentu
//   --class <class_id>   hanya satu kelas
//   --db <path>          override lokasi db.json (default: LMS_DB_PATH atau data/db.json)

import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const dbPath = getArg('--db') || process.env.LMS_DB_PATH || path.join(root, 'data', 'db.json');
const onlyNis = getArg('--nis') ? String(getArg('--nis')).split(',').map((s) => s.trim()).filter(Boolean) : null;
const onlyClass = getArg('--class');

if (!fs.existsSync(dbPath)) {
  console.error(`db.json tidak ditemukan: ${dbPath}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const students = Array.isArray(db.students) ? db.students : [];
const users = Array.isArray(db.users) ? db.users : [];

let targets = students.filter((s) => String(s.nis || '').trim());
if (onlyNis) targets = targets.filter((s) => onlyNis.includes(String(s.nis).trim()));
if (onlyClass) targets = targets.filter((s) => s.class_id === onlyClass);

if (!targets.length) {
  console.error('Tidak ada siswa yang cocok dengan filter.');
  process.exit(1);
}

console.log(`Database : ${dbPath}`);
console.log(`Mode     : ${apply ? 'APPLY (menulis)' : 'DRY-RUN (tidak menulis)'}`);
console.log(`Target   : ${targets.length} siswa${onlyNis ? ` (NIS: ${onlyNis.join(',')})` : ''}${onlyClass ? ` (kelas ${onlyClass})` : ''}\n`);

let changed = 0;
let linked = 0;
let skipped = 0;

for (const s of targets) {
  const nis = String(s.nis).trim();
  const sudah = s.password && bcrypt.compareSync(nis, s.password);
  if (sudah) skipped++;

  const hash = apply ? bcrypt.hashSync(nis, 10) : s.password;
  if (apply) {
    s.password = hash;
    s.password_reset_at = new Date().toISOString();
  }
  changed++;

  // baris users yang tertaut (login siswa memakai baris users bila ada)
  const rows = users.filter((u) => u.role === 'student' && (
    (s.user_id && u.id === s.user_id) || (s.email && u.email === s.email)
  ));
  for (const u of rows) {
    if (apply) u.password = bcrypt.hashSync(nis, 10);
    linked++;
  }

  if (changed <= 5 || onlyNis) {
    console.log(`  ${nis.padEnd(8)} ${String(s.nama || '').slice(0, 28).padEnd(30)} ${sudah ? 'sudah NIS' : 'diperbarui'}${rows.length ? ` (+${rows.length} user)` : ''}`);
  }
}

if (changed > 5 && !onlyNis) console.log(`  ... dan ${changed - 5} siswa lain`);

if (apply) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${dbPath}.backup-nispw-${stamp}`;
  fs.copyFileSync(dbPath, backup);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log(`\nBackup   : ${backup}`);
  console.log(`Ditulis  : ${dbPath}`);
} else {
  console.log('\nJalankan ulang dengan --apply untuk menerapkan.');
}

console.log(`Ringkasan: ${changed} siswa diproses, ${skipped} sudah berpassword NIS, ${linked} baris users disinkronkan.`);
if (apply) console.log('Langkah berikutnya: pm2 restart lms --update-env');
