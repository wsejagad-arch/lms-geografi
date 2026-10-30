#!/usr/bin/env node
// Reset / set password akun admin pada data/db.json (dijalankan di server aplikasi).
//
//   node scripts/reset-admin-password.mjs --list
//   node scripts/reset-admin-password.mjs --password 'RahasiaBaru123'
//   node scripts/reset-admin-password.mjs --email admin@lms.id --password 'RahasiaBaru123'
//   node scripts/reset-admin-password.mjs            (password acak, dicetak sekali)
//
// Opsi:
//   --email <email>   akun target (default: akun admin/super_admin pertama)
//   --password <pw>   password baru (min 8 karakter). Kosong = dibuat acak.
//   --promote         jika email belum ada, buat akun super_admin baru
//   --db <path>       override lokasi db.json

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const getArg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

const dbPath = getArg('--db') || process.env.LMS_DB_PATH || path.join(root, 'data', 'db.json');
if (!fs.existsSync(dbPath)) {
  console.error(`db.json tidak ditemukan: ${dbPath}`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
if (!Array.isArray(db.users)) db.users = [];

const admins = db.users.filter((u) => u.role === 'admin' || u.role === 'super_admin');

if (args.includes('--list')) {
  console.log(`Database: ${dbPath}`);
  if (!admins.length) console.log('Tidak ada akun admin.');
  admins.forEach((u) => console.log(`  ${u.email}  (${u.role})  tenant=${u.tenant_id || '-'}  dibua  t=${u.created_at || '-'}`));
  console.log('\nCatatan: hash bcrypt tidak bisa dibaca balik; gunakan --password untuk mengganti.');
  process.exit(0);
}

function generate(len = 14) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const email = (getArg('--email') || '').trim();
let target = null;

if (email) {
  target = db.users.find((u) => String(u.email || '').toLowerCase() === email.toLowerCase());
  if (!target && args.includes('--promote')) {
    target = {
      id: crypto.randomUUID(),
      email,
      nama: 'Super Admin',
      role: 'super_admin',
      tenant_id: null,
      created_at: new Date().toISOString(),
    };
    db.users.push(target);
    console.log(`Akun baru dibuat: ${email} (super_admin)`);
  }
  if (!target) {
    console.error(`Akun ${email} tidak ditemukan. Tambahkan --promote untuk membuatnya.`);
    process.exit(1);
  }
} else {
  target = admins[0];
  if (!target) {
    console.error('Tidak ada akun admin. Gunakan --email <email> --promote.');
    process.exit(1);
  }
}

const plain = getArg('--password') || generate();
if (String(plain).length < 8) {
  console.error('Password minimal 8 karakter.');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${dbPath}.backup-adminpw-${stamp}`;
fs.copyFileSync(dbPath, backup);

target.password = bcrypt.hashSync(String(plain), 10);
target.password_reset_at = new Date().toISOString();
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`Database : ${dbPath}`);
console.log(`Backup   : ${backup}`);
console.log(`Akun     : ${target.email} (${target.role})`);
console.log(`Password : ${plain}`);
console.log('\nSegera login lalu ganti password lewat POST /api/me/password.');
console.log('Langkah berikutnya: pm2 restart lms --update-env');
