#!/usr/bin/env node
// Membuat akun guru (role teacher) atau admin pada data/db.json.
//
//   node scripts/create-teacher.mjs --email guru@sekolah.id --nama "Nama Guru"
//   node scripts/create-teacher.mjs --list
//
// Opsi:
//   --email <email>     email login guru (wajib bila bukan --list)
//   --nama <nama>       nama tampilan
//   --password <pw>     password awal (min 8). Kosong = dibuat acak dan dicetak.
//   --role <role>       teacher (default) atau admin
//   --db <path>         override lokasi db.json

import bcrypt from 'bcryptjs';
import dataStore from '../data-store.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

const dbPath = getArg('--db') || process.env.LMS_DB_PATH || path.join(root, 'data', 'db.json');
// Baca/tulis lewat data-store agar SQLite (sumber kebenaran) dan cermin db.json tetap sinkron.
await dataStore.init({ dbPath, sqlitePath: process.env.LMS_SQLITE_PATH });
const db = await dataStore.loadDB();
if (!Array.isArray(db.users)) db.users = [];

if (args.includes('--list')) {
  db.users
    .filter((u) => u.role !== 'student')
    .forEach((u) => console.log(`${u.email || '-'}  (${u.role})  tenant=${u.tenant_id || '-'}`));
  process.exit(0);
}

const email = String(getArg('--email') || '').trim().toLowerCase();
if (!email) {
  console.error('Wajib: --email <email>');
  process.exit(1);
}
if (db.users.some((u) => String(u.email || '').toLowerCase() === email)) {
  console.error(`Akun ${email} sudah ada. Gunakan scripts/reset-admin-password.mjs untuk mengganti password.`);
  process.exit(1);
}

const role = getArg('--role') === 'admin' ? 'admin' : 'teacher';
const nama = String(getArg('--nama') || email.split('@')[0]).slice(0, 80);
function generate(len = 12) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
const plain = getArg('--password') || generate();
if (String(plain).length < 8) {
  console.error('Password minimal 8 karakter.');
  process.exit(1);
}

const tenant = (db.tenants || [])[0] || null;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, `${dbPath}.backup-user-${stamp}`);

db.users.push({
  id: crypto.randomUUID(),
  email,
  username: email.split('@')[0],
  password: bcrypt.hashSync(String(plain), 10),
  nama,
  role,
  tenant_id: tenant ? tenant.id : null,
  created_at: new Date().toISOString()
});
await dataStore.saveDB(db);

console.log(`Akun dibuat : ${email} (${role})`);
console.log(`Nama        : ${nama}`);
console.log(`Tenant      : ${tenant ? tenant.nama : '-'}`);
console.log(`Password    : ${plain}`);
console.log('Langkah berikutnya: pm2 restart lms --update-env');
