const bcrypt = require('bcryptjs');
const express = require('express');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const fs = require('fs/promises');
const path = require('path');
const whatsappSender = require('./whatsapp-sender');

const app = express();
const DB_PATH = process.env.LMS_DB_PATH || path.join(__dirname, 'data', 'db.json');

// ===== REDIS (with fallback) =====
let redis = null;
let cache = new Map();
let redisWarned = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false
  });
  
  redis.on('ready', async () => {
    console.log('Redis connected');
    if (process.env.LMS_REDIS_FLUSH_ON_START === '1') {
      try {
        await redis.flushdb();
        console.log('[redis] seluruh cache dibersihkan (LMS_REDIS_FLUSH_ON_START=1)');
      } catch {}
    }
    await clearLoginLocks();
  });
  
  redis.on('error', () => {
    if (!redisWarned) {
      redisWarned = true;
      console.log('Redis not available, using in-memory cache');
    }
    redis = null;
  });
} catch (e) {
  console.log('Redis not installed, using in-memory cache');
  redis = null;
}

async function cacheGet(key) {
  if (redis) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }
  return cache.get(key) || null;
}

async function cacheSet(key, value, ttl = 300) {
  if (redis) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return;
    } catch {}
  }
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttl * 1000);
}

async function cacheDel(key) {
  if (redis) {
    try { await redis.del(key); } catch {}
  }
  cache.delete(key);
}

// Kunci limiter login dibersihkan setiap proses start / reconnect agar pembatasan
// percobaan lama tidak menahan pengguna setelah aplikasi dibuka kembali.
async function clearLoginLocks() {
  if (!redis) return 0;
  let cursor = '0';
  let removed = 0;
  try {
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'login-fail:*', 'COUNT', 200);
      cursor = next;
      if (keys && keys.length) {
        await redis.del(...keys);
        removed += keys.length;
      }
    } while (cursor !== '0');
  } catch {
    return removed;
  }
  if (removed) console.log(`[redis] ${removed} kunci limiter login dibersihkan saat start`);
  return removed;
}

// ===== DATABASE =====
// Penyimpanan nyata ada di data-store.js: SQLite (node:sqlite / better-sqlite3) sebagai
// sumber kebenaran, dengan cermin db.json untuk skrip CLI dan pemulihan berbasis berkas.
const dataStore = require('./data-store');
const { emptyDB, normalizeDB, fileExists } = dataStore;

async function loadDB() {
  return dataStore.loadDB();
}

async function saveDB(db) {
  return dataStore.saveDB(db);
}

async function initDB() {
  const db = await loadDB();
  if (db.users.length === 0) {
      // Seed super admin. Password dari ADMIN_PASSWORD, atau acak sekali (dicetak ke stdout).
      const seedPassword = (process.env.ADMIN_PASSWORD || '').trim() || crypto.randomBytes(9).toString('base64url');
      db.users.push({
        id: uuidv4(),
        email: process.env.ADMIN_EMAIL || 'admin@lms.id',
        password: bcrypt.hashSync(seedPassword, 10),
        nama: 'Super Admin',
        role: 'super_admin',
        tenant_id: null
      });
      await saveDB(db);
      console.log(`[seed] Super admin dibuat: ${process.env.ADMIN_EMAIL || 'admin@lms.id'}`);
      if (!process.env.ADMIN_PASSWORD) {
        console.log(`[seed] Password awal (hanya tampil sekali): ${seedPassword}`);
        console.log('[seed] Segera ganti password akun admin.');
      }
    }
    return db;
  }

// ===== MIDDLEWARE =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  // Halaman HTML tidak di-cache agar pembaruan UI langsung terpakai.
  setHeaders(res, filePath) {
    if (/\.html?$/i.test(filePath)) res.setHeader('Cache-Control', 'no-store');
  }
}));
app.set('trust proxy', 1);
const IS_PROD = process.env.NODE_ENV === 'production';
const RAW_SESSION_SECRET = (process.env.SESSION_SECRET || '').trim();
if (IS_PROD && (!RAW_SESSION_SECRET || RAW_SESSION_SECRET === 'lms-secret-key-2024-multi-tenant')) {
  console.error('FATAL: SESSION_SECRET wajib diisi di production. Buat dengan: openssl rand -hex 32');
  process.exit(1);
}
const SESSION_KEYS = (RAW_SESSION_SECRET || 'dev-only-insecure-secret')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);
app.use(cookieSession({
  name: 'lms_session',
  keys: SESSION_KEYS,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: IS_PROD,
  rolling: true
}));

// Auth middleware
const SESSION_ONLINE_MS = Number(process.env.SESSION_ONLINE_MS || 120000);
const SESSION_TOUCH_MS = Number(process.env.SESSION_TOUCH_MS || 30000);

function clientMeta(req) {
  const h = req.headers || {};
  const ip = String(h['cf-connecting-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || req.ip || '').trim();
  const city = h['cf-ipcity'] || '';
  const region = h['cf-region'] || h['cf-region-code'] || '';
  const country = h['cf-ipcountry'] || '';
  const ipLokasi = [city, region, country].filter(Boolean).join(', ');
  const ipLat = Number(h['cf-iplatitude']);
  const ipLng = Number(h['cf-iplongitude']);

  // Koordinat dari perangkat (dikirim halaman login) lebih akurat daripada IP.
  const geo = (req.body && typeof req.body.geo === 'object' && req.body.geo) || {};
  const lat = Number(geo.lat);
  const lng = Number(geo.lng);
  const acc = Number(geo.accuracy);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const deviceLokasi = hasGeo
    ? `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}${Number.isFinite(acc) ? ` (±${Math.round(acc)} m)` : ''}`
    : '';
  const lokasi = [deviceLokasi, ipLokasi].filter(Boolean).join(' · ');

  return {
    ip,
    lokasi,
    ua: String(h['user-agent'] || '').slice(0, 180),
    geo_lat: hasGeo ? lat : (Number.isFinite(ipLat) ? ipLat : null),
    geo_lng: hasGeo ? lng : (Number.isFinite(ipLng) ? ipLng : null),
    geo_accuracy: hasGeo && Number.isFinite(acc) ? Math.round(acc) : null,
    geo_source: hasGeo ? 'device' : (Number.isFinite(ipLat) && Number.isFinite(ipLng) ? 'ip' : (ipLokasi ? 'ip-city' : ''))
  };
}

function touchSession(db, req, user) {
  if (!Array.isArray(db.session_logs)) db.session_logs = [];
  if (!req.session.sid) req.session.sid = uuidv4();
  const now = new Date().toISOString();
  const meta = clientMeta(req);
  let rec = db.session_logs.find(s => s.id === req.session.sid);
  if (!rec) {
    rec = { id: req.session.sid, login_at: now };
    db.session_logs.push(rec);
  }
  rec.user_id = user.id;
  rec.nama = user.nama || user.email || '';
  rec.email = user.email || '';
  rec.role = user.role;
  rec.tenant_id = req.session.tenantId || user.tenant_id || null;
  rec.ip = meta.ip;
  rec.lokasi = meta.lokasi;
  rec.ua = meta.ua;
  rec.geo_lat = meta.geo_lat;
  rec.geo_lng = meta.geo_lng;
  rec.geo_accuracy = meta.geo_accuracy;
  rec.geo_source = meta.geo_source;
  rec.last_seen_at = now;
  rec.active = true;
  if (user.role === 'student') {
    const st = db.students.find(s =>
      s.user_id === user.id || s.id === user.student_id || (user.email && s.email === user.email)
    );
    if (st) {
      const c = db.classes.find(x => x.id === st.class_id);
      rec.student_id = st.id;
      rec.nis = st.nis;
      rec.kelas_id = st.class_id || null;
      rec.kelas_nama = c ? c.nama : '-';
    }
  }
  return rec;
}

function makeActivityRecord(db, req, user, aksi, detail = '') {
  const student = user.role === 'student'
    ? db.students.find(s => s.id === studentIdOf(db, user))
    : null;
  const kelas = student && db.classes.find(c => c.id === student.class_id);
  const meta = clientMeta(req);
  return {
    id: uuidv4(),
    tenant_id: req.session?.tenantId || user.tenant_id || (student && student.tenant_id) || null,
    user_id: user.id,
    student_id: student ? student.id : null,
    nama: (student && student.nama) || user.nama || user.email || '',
    role: user.role || '',
    nis: student ? student.nis || '' : '',
    kelas_nama: kelas ? kelas.nama : '',
    aksi,
    detail,
    path: String(req.path || '').slice(0, 180),
    ip: meta.ip,
    ua: meta.ua,
    lokasi: meta.lokasi,
    geo_lat: meta.geo_lat,
    geo_lng: meta.geo_lng,
    created_at: new Date().toISOString()
  };
}

function activityForMutation(req, responseBody) {
  const pathname = String(req.path || '');
  const bab = pathname.match(/^\/api\/kurikulum\/([^/]+)\/evaluasi$/);
  if (pathname === '/api/me/password') return { aksi: 'Mengganti password', detail: 'Password akun diperbarui' };
  if (bab) {
    const score = Number(responseBody && responseBody.score);
    return {
      aksi: 'Mengerjakan evaluasi materi',
      detail: `Materi ${decodeURIComponent(bab[1])}${Number.isFinite(score) ? ` · nilai ${score}` : ''}`
    };
  }
  if (/^\/api\/kurikulum\/[^/]+\/progress$/.test(pathname)) {
    return { aksi: 'Menyimpan progres belajar', detail: `Materi ${pathname.split('/')[3]}` };
  }
  const exam = pathname.match(/^\/api\/exams\/([^/]+)\/submit$/);
  if (exam) {
    const score = Number(responseBody && responseBody.nilai);
    return {
      aksi: 'Mengumpulkan ujian',
      detail: `Ujian ${decodeURIComponent(exam[1])}${Number.isFinite(score) ? ` · nilai ${score}` : ''}`
    };
  }
  if (/^\/api\/students\/[^/]+\/reset-password$/.test(pathname)
    || pathname === '/api/students/reset-passwords') {
    return { aksi: 'Mereset password siswa', detail: 'Reset password dilakukan oleh admin' };
  }
  const section = pathname.replace(/^\/api\//, '').split('/')[0] || 'data';
  const verbs = { POST: 'Menambahkan data', PUT: 'Mengubah data', PATCH: 'Mengubah data', DELETE: 'Menghapus data' };
  return { aksi: verbs[req.method] || 'Memperbarui data', detail: section };
}

let activityWriteQueue = Promise.resolve();
function persistActivity(record) {
  const previousWrite = activityWriteQueue.catch(error => {
    console.error('Log aktivitas sebelumnya gagal disimpan:', error);
  });
  activityWriteQueue = previousWrite.then(async () => {
    const db = await loadDB();
    if (!Array.isArray(db.activity_logs)) db.activity_logs = [];
    db.activity_logs.push(record);
    await saveDB(db);
  });
  return activityWriteQueue;
}

// Siswa hanya boleh membaca datanya sendiri, menyimpan progres belajar, dan mengirim nilai.
const STUDENT_ROUTES = [
  ['GET', /^\/api\/me$/],
  ['POST', /^\/api\/me\/password$/],
  ['POST', /^\/api\/me\/whatsapp$/],
  ['GET', /^\/api\/materials$/],
  ['GET', /^\/api\/exams$/],
  ['POST', /^\/api\/exams\/[^/]+\/submit$/],
  ['GET', /^\/api\/grades$/],
  ['GET', /^\/api\/attendance$/],
  ['GET', /^\/api\/assignments$/],
  ['GET', /^\/api\/kurikulum(\/[^/]+)?$/],
  ['GET', /^\/api\/kurikulum\/peringkat$/],
  ['PUT', /^\/api\/kurikulum\/[^/]+\/progress$/],
  ['POST', /^\/api\/kurikulum\/[^/]+\/evaluasi$/],
  ['POST', /^\/api\/kurikulum\/naik-kelas$/],
  ['GET', /^\/api\/jurnal$/],
  ['POST', /^\/api\/jurnal$/]
];

function isStudentRoute(method, reqPath) {
  return STUDENT_ROUTES.some(([m, re]) => m === method && re.test(reqPath));
}

function generatePassword(len = 10) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// ===== RATE LIMIT LOGIN =====
// Disimpan lewat cacheGet/cacheSet, jadi ikut Redis bila tersedia (lintas proses PM2).
const LOGIN_MAX_FAILS = Number(process.env.LOGIN_MAX_FAILS || 10);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 5 * 60 * 1000);
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);

function clientIp(req) {
  const h = req.headers || {};
  return String(h['cf-connecting-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || req.ip || '').trim();
}

function loginKey(req, identifier) {
  return `login-fail:${clientIp(req)}|${String(identifier || '').toLowerCase()}`;
}

async function loginLockMs(key) {
  const rec = await cacheGet(key);
  if (!rec) return 0;
  if (rec.fails < LOGIN_MAX_FAILS) return 0;
  const left = Number(rec.reset_at || 0) - Date.now();
  return left > 0 ? left : 0;
}

async function loginFail(key) {
  const now = Date.now();
  const rec = (await cacheGet(key)) || { fails: 0, reset_at: now + LOGIN_WINDOW_MS };
  if (now > Number(rec.reset_at || 0)) { rec.fails = 0; rec.reset_at = now + LOGIN_WINDOW_MS; }
  rec.fails = Number(rec.fails || 0) + 1;
  await cacheSet(key, rec, Math.ceil(LOGIN_WINDOW_MS / 1000));
}

async function loginSuccess(key) {
  await cacheDel(key);
}

// Kembalikan key bila boleh lanjut; kirim 429 dan kembalikan null bila terkunci.
async function guardLogin(req, res, identifier) {
  const key = loginKey(req, identifier);
  const left = await loginLockMs(key);
  if (left > 0) {
    const secs = Math.max(1, Math.ceil(left / 1000));
    res.set('Retry-After', String(secs));
    res.status(429).json({ error: `Terlalu banyak percobaan. Coba lagi dalam ${secs} detik.`, retry_after: secs });
    return null;
  }
  return key;
}

function studentIdOf(db, user) {
  if (user.student_id) return user.student_id;
  const s = db.students.find(x => x.user_id === user.id || (user.email && x.email === user.email));
  return s ? s.id : null;
}

// Buang kunci jawaban sebelum soal dikirim ke siswa.
function publicQuestion(q) {
  return {
    id: q.id,
    pertanyaan: q.pertanyaan,
    opsi_a: q.opsi_a,
    opsi_b: q.opsi_b,
    opsi_c: q.opsi_c,
    opsi_d: q.opsi_d,
    jenis: q.jenis,
    poin: q.poin
  };
}

async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  req.db = db;

  if (user.role === 'student') {
    req.studentId = studentIdOf(db, user);
    if (!req.studentId) {
      return res.status(403).json({ error: 'Akun siswa belum terhubung ke data siswa' });
    }
    if (!isStudentRoute(req.method, req.path)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const prev = req.session.sid ? (db.session_logs || []).find(s => s.id === req.session.sid) : null;
  const stale = !prev || Date.now() - new Date(prev.last_seen_at || 0).getTime() > SESSION_TOUCH_MS;
  if (stale) {
    touchSession(db, req, user);
    await saveDB(db);
  }

  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Guru juga boleh mengisi jurnal mengajar.
async function requireStaff(req, res, next) {
  if (!req.session.userId || !['admin', 'super_admin', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

async function requireTenant(req, res, next) {
  if (!req.session.tenantId) {
    return res.status(403).json({ error: 'No tenant selected' });
  }
  req.tenantId = req.session.tenantId;
  next();
}

// ===== KUNCI TULIS =====
// Setiap request yang mengubah data dijalankan bergantian. Tanpa ini, dua request yang
// membaca DB bersamaan lalu menyimpan masing-masing akan saling menimpa (lost update) —
// misalnya dua siswa mengirim evaluasi pada detik yang sama, atau simpan draf berbarengan
// dengan kirim jawaban, sehingga nilai/percobaan kedua tidak tercatat.
let writeLock = Promise.resolve();

function withWriteLock(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (process.env.LMS_DISABLE_WRITE_LOCK === '1') return next();
  const previous = writeLock;
  let release;
  writeLock = new Promise(resolve => { release = resolve; });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(guard);
    release();
  };
  // Pengaman: jangan sampai kunci tertahan selamanya bila handler gagal merespons.
  const guard = setTimeout(finish, 20000);
  if (guard && typeof guard.unref === 'function') guard.unref();
  res.on('finish', finish);
  res.on('close', finish);
  previous.then(() => {
    // Request bisa saja sudah dibatalkan klien saat menunggu giliran.
    if (res.writableEnded || res.destroyed) return finish();
    next();
  });
}

app.use('/api', withWriteLock);

app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const sendJson = res.json.bind(res);
  res.json = body => {
    if (!req.user || res.statusCode >= 400) return sendJson(body);
    const event = activityForMutation(req, body);
    const record = makeActivityRecord(req.db || { students: [], classes: [] }, req, req.user, event.aksi, event.detail);
    persistActivity(record).then(
      () => sendJson(body),
      error => {
        console.error('Gagal menyimpan log aktivitas:', error);
        sendJson(body);
      }
    );
    return res;
  };
  next();
});

// ===== TENANT MANAGEMENT =====
app.post('/api/tenants', requireAuth, requireAdmin, async (req, res) => {
  const { nama, slug, description } = req.body;
  const db = req.db;
  
  const tenant = {
    id: uuidv4(),
    nama,
    slug,
    description,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.tenants.push(tenant);
  await saveDB(db);
  
  res.json(tenant);
});

app.get('/api/tenants', requireAuth, requireAdmin, async (req, res) => {
  const db = req.db;
  const tenants = db.tenants.map(t => ({
    id: t.id,
    nama: t.nama,
    slug: t.slug,
    description: t.description,
    created_at: t.created_at
  }));
  res.json(tenants);
});

app.post('/api/tenants/select', requireAuth, async (req, res) => {
  const { tenant_id } = req.body;
  const db = req.db;
  
  // Verify tenant exists
  const tenant = db.tenants.find(t => t.id === tenant_id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  
  // Verify user has access to tenant
  if (req.user.role !== 'super_admin' && req.user.tenant_id !== tenant_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  req.session.tenantId = tenant_id;
  res.json({ success: true, tenant });
});

// ===== JURNAL MENGAJAR & PRESENSI KETUA KELAS =====
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function wibNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((acc, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc; }, {});
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  const hari = HARI_ID[new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))).getUTCDay()];
  return { date, time, hari };
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function jurnalKey(tenantId, classId, tanggal, scheduleId) {
  return `${tenantId}|${classId}|${tanggal}|${scheduleId}`;
}

function ketuaClassOf(db, studentId) {
  return db.classes.find(c => c.ketua_id === studentId) || null;
}

function scheduleWindowOpen(schedule, time) {
  if (!schedule) return false;
  return time >= String(schedule.jam_mulai || '') && time <= String(schedule.jam_selesai || '23:59');
}

function ensureJurnal(db, { tenantId, classId, scheduleId, tanggal, ketuaId, source }) {
  if (!Array.isArray(db.jurnal)) db.jurnal = [];
  let entry = db.jurnal.find(j => j.tenant_id === tenantId && j.class_id === classId
    && j.schedule_id === scheduleId && j.tanggal === tanggal);
  if (!entry) {
    entry = {
      id: uuidv4(),
      tenant_id: tenantId,
      class_id: classId,
      schedule_id: scheduleId,
      tanggal,
      ketua_id: ketuaId || '',
      materi: '',
      kegiatan: '',
      attendance: [],
      source: source || 'ketua',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.jurnal.push(entry);
  }
  return entry;
}

// Tandai hadir otomatis saat siswa membuka LMS di dalam radius sekolah.
function autoPresensiFromGeo(db, user, student, meta) {
  if (!student || meta.geo_lat === null || meta.geo_lng === null) return null;
  const tenant = db.tenants.find(t => t.id === student.tenant_id);
  const school = tenant && tenant.school;
  if (!school || !Number.isFinite(Number(school.lat)) || !Number.isFinite(Number(school.lng))) return null;
  const radius = Number(school.radius_m) || 500;
  const jarak = distanceMeters(Number(school.lat), Number(school.lng), meta.geo_lat, meta.geo_lng);
  if (jarak > radius) return null;
  const now = wibNow();
  const schedule = db.schedules.find(s => s.tenant_id === student.tenant_id
    && s.class_id === student.class_id && s.hari === now.hari && scheduleWindowOpen(s, now.time));
  if (!schedule) return null;
  const entry = ensureJurnal(db, {
    tenantId: student.tenant_id,
    classId: student.class_id,
    scheduleId: schedule.id,
    tanggal: now.date,
    ketuaId: (db.classes.find(c => c.id === student.class_id) || {}).ketua_id || '',
    source: 'auto'
  });
  if (!Array.isArray(entry.attendance)) entry.attendance = [];
  const row = entry.attendance.find(a => a.student_id === student.id);
  if (!row) {
    entry.attendance.push({ student_id: student.id, nis: student.nis, nama: student.nama, status: 'H', keterangan: 'Otomatis (dalam area sekolah)', auto: true });
  } else if (!row.status) {
    row.status = 'H';
    row.keterangan = row.keterangan || 'Otomatis (dalam area sekolah)';
    row.auto = true;
  }
  entry.updated_at = new Date().toISOString();
  return { schedule, jarak };
}

// ===== MONITOR USER AKTIF =====
app.get('/api/jurnal', requireAuth, requireTenant, async (req, res) => {
  const db = req.db || await loadDB();
  const student = db.students.find(s => s.id === studentIdOf(db, req.user));
  if (!student) return res.status(403).json({ error: 'Hanya siswa' });
  const classItem = ketuaClassOf(db, student.id);
  if (!classItem) return res.status(403).json({ error: 'Menu jurnal hanya untuk ketua kelas' });

  const now = wibNow();
  const roster = db.students
    .filter(s => s.class_id === classItem.id)
    .map(s => ({ id: s.id, nis: s.nis || '', nama: s.nama || '' }))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  const schedules = db.schedules
    .filter(s => s.tenant_id === student.tenant_id && s.class_id === classItem.id && s.hari === now.hari)
    .sort((a, b) => String(a.jam_mulai).localeCompare(String(b.jam_mulai)))
    .map(s => {
      const subject = db.subjects.find(x => x.id === s.subject_id);
      return {
        id: s.id,
        subject_id: s.subject_id,
        mapel: subject ? subject.nama : '-',
        jam_mulai: s.jam_mulai,
        jam_selesai: s.jam_selesai,
        open: scheduleWindowOpen(s, now.time)
      };
    });
  const active = schedules.find(s => s.id === String(req.query.schedule_id || ''))
    || schedules.find(s => s.open)
    || schedules[0]
    || null;
  const entry = active
    ? (db.jurnal || []).find(j => j.tenant_id === student.tenant_id && j.class_id === classItem.id
      && j.schedule_id === active.id && j.tanggal === now.date) || null
    : null;

  res.json({
    date: now.date,
    time: now.time,
    hari: now.hari,
    role: 'ketua',
    class: { id: classItem.id, nama: classItem.nama },
    roster,
    schedules,
    active_schedule_id: active ? active.id : '',
    can_fill: schedules.length > 0,
    window_open: active ? active.open : false,
    entry
  });
});

app.post('/api/jurnal', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const student = db.students.find(s => s.id === studentIdOf(db, req.user));
  if (!student) return res.status(403).json({ error: 'Hanya siswa' });
  const classItem = ketuaClassOf(db, student.id);
  if (!classItem) return res.status(403).json({ error: 'Menu jurnal hanya untuk ketua kelas' });

  const schedule = db.schedules.find(s => s.id === req.body?.schedule_id
    && s.tenant_id === student.tenant_id && s.class_id === classItem.id);
  if (!schedule) return res.status(400).json({ error: 'Jadwal pelajaran tidak valid untuk kelas ini' });

  const now = wibNow();
  const tanggal = String(req.body?.tanggal || now.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ error: 'Tanggal tidak valid' });
  if (tanggal !== now.date) return res.status(400).json({ error: 'Jurnal hanya dapat diisi untuk hari ini' });

  const materi = String(req.body?.materi || '').trim().slice(0, 300);
  const kegiatan = String(req.body?.kegiatan || '').trim().slice(0, 1000);
  const allowed = ['H', 'I', 'S', 'D', 'A'];
  const rows = Array.isArray(req.body?.attendance) ? req.body.attendance : [];
  const roster = db.students.filter(s => s.class_id === classItem.id);
  const attendance = roster.map(s => {
    const found = rows.find(r => r.student_id === s.id) || {};
    const status = allowed.includes(found.status) ? found.status : '';
    return {
      student_id: s.id,
      nis: s.nis || '',
      nama: s.nama || '',
      status,
      keterangan: String(found.keterangan || '').slice(0, 120)
    };
  });

  const entry = ensureJurnal(db, {
    tenantId: student.tenant_id,
    classId: classItem.id,
    scheduleId: schedule.id,
    tanggal,
    ketuaId: student.id,
    source: 'ketua'
  });
  entry.materi = materi || entry.materi;
  entry.kegiatan = kegiatan || entry.kegiatan;
  entry.attendance = attendance;
  entry.ketua_id = student.id;
  entry.ketua_nama = student.nama || '';
  entry.filled_at = now.time;
  entry.window_open = scheduleWindowOpen(schedule, now.time);
  entry.outside_window = !entry.window_open;
  entry.updated_at = new Date().toISOString();

  db.activity_logs.push(makeActivityRecord(db, req, req.user, 'Mengisi jurnal mengajar', `${classItem.nama} · ${schedule.jam_mulai}`));
  await saveDB(db);

  // Kirim ke SIMANIS bila webhook dikonfigurasi (opsional, tidak memblokir respons).
  const webhook = (process.env.SIMANIS_WEBHOOK_URL || '').trim();
  if (webhook) {
    const subject = db.subjects.find(s => s.id === schedule.subject_id);
    fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.SIMANIS_TOKEN ? { Authorization: `Bearer ${process.env.SIMANIS_TOKEN}` } : {}) },
      body: JSON.stringify({
        source: 'Geo Edulabs',
        tenant_id: student.tenant_id,
        tanggal,
        kelas: classItem.nama,
        mapel: subject ? subject.nama : '',
        jam_mulai: schedule.jam_mulai,
        jam_selesai: schedule.jam_selesai,
        materi: entry.materi,
        kegiatan: entry.kegiatan,
        attendance: entry.attendance
      })
    }).catch(error => console.error('Kirim jurnal ke SIMANIS gagal:', error));
  }

  res.json({ success: true, entry });
});

app.get('/api/admin/sekolah', requireAuth, requireAdmin, async (req, res) => {
  const db = await loadDB();
  const tenant = db.tenants.find(t => t.id === req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
  res.json(tenant.school || { lat: null, lng: null, radius_m: 500 });
});

app.put('/api/admin/sekolah', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const radius = Number(req.body?.radius_m) || 500;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Koordinat sekolah tidak valid' });
  }
  const db = await loadDB();
  const tenant = db.tenants.find(t => t.id === req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
  tenant.school = { lat, lng, radius_m: Math.min(5000, Math.max(50, Math.round(radius))) };
  await saveDB(db);
  res.json({ success: true, school: tenant.school });
});

app.get('/api/admin/jurnal', requireAuth, requireStaff, requireTenant, async (req, res) => {
  const db = await loadDB();
  const tanggal = String(req.query.tanggal || wibNow().date);
  const rows = (db.jurnal || [])
    .filter(j => j.tenant_id === req.tenantId && j.tanggal === tanggal)
    .map(j => {
      const classItem = db.classes.find(c => c.id === j.class_id);
      const schedule = db.schedules.find(s => s.id === j.schedule_id);
      const subject = schedule && db.subjects.find(s => s.id === schedule.subject_id);
      const att = j.attendance || [];
      return {
        id: j.id,
        tanggal: j.tanggal,
        kelas: classItem ? classItem.nama : '-',
        mapel: subject ? subject.nama : '-',
        jam: schedule ? `${schedule.jam_mulai}-${schedule.jam_selesai}` : '-',
        materi: j.materi || '',
        kegiatan: j.kegiatan || '',
        ketua: j.ketua_nama || '',
        guru: j.guru_nama || '',
        sumber: j.source || '',
        hadir: att.filter(a => a.status === 'H').length,
        sakit: att.filter(a => a.status === 'S').length,
        izin: att.filter(a => a.status === 'I').length,
        dispensasi: att.filter(a => a.status === 'D').length,
        alpa: att.filter(a => a.status === 'A').length,
        total: att.length,
        terisi: att.filter(a => a.status).length,
        attendance: att
      };
    })
    .sort((a, b) => `${a.jam}${a.kelas}`.localeCompare(`${b.jam}${b.kelas}`));
  res.json({ tanggal, rows });
});

// Ekspor siap-kirim ke SIMANIS (JSON). Bila SIMANIS_WEBHOOK_URL diset, data juga dikirim otomatis saat jurnal disimpan.
// Guru/admin mengisi atau memperbarui jurnal kelas (termasuk presensi).
app.post('/api/admin/jurnal', requireAuth, requireStaff, requireTenant, async (req, res) => {
  const db = await loadDB();
  const classItem = db.classes.find(c => c.id === req.body?.class_id && c.tenant_id === req.tenantId);
  if (!classItem) return res.status(400).json({ error: 'Kelas tidak valid' });
  const schedule = db.schedules.find(s => s.id === req.body?.schedule_id
    && s.tenant_id === req.tenantId && s.class_id === classItem.id);
  if (!schedule) return res.status(400).json({ error: 'Jadwal pelajaran tidak valid untuk kelas ini' });

  const tanggal = String(req.body?.tanggal || wibNow().date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ error: 'Tanggal tidak valid' });

  const allowed = ['H', 'I', 'S', 'D', 'A'];
  const rows = Array.isArray(req.body?.attendance) ? req.body.attendance : [];
  const roster = db.students.filter(s => s.class_id === classItem.id);
  const attendance = roster.map(s => {
    const found = rows.find(r => r.student_id === s.id) || {};
    return {
      student_id: s.id,
      nis: s.nis || '',
      nama: s.nama || '',
      status: allowed.includes(found.status) ? found.status : '',
      keterangan: String(found.keterangan || '').slice(0, 120)
    };
  });

  const entry = ensureJurnal(db, {
    tenantId: req.tenantId,
    classId: classItem.id,
    scheduleId: schedule.id,
    tanggal,
    ketuaId: classItem.ketua_id || '',
    source: 'guru'
  });
  entry.materi = String(req.body?.materi || '').trim().slice(0, 300) || entry.materi;
  entry.kegiatan = String(req.body?.kegiatan || '').trim().slice(0, 1000) || entry.kegiatan;
  entry.attendance = attendance;
  entry.source = 'guru';
  entry.guru_id = req.user.id;
  entry.guru_nama = req.user.nama || req.user.email || '';
  entry.updated_at = new Date().toISOString();

  db.activity_logs.push(makeActivityRecord(db, req, req.user, 'Mengisi jurnal (guru)', `${classItem.nama} · ${schedule.jam_mulai}`));
  await saveDB(db);

  const webhook = (process.env.SIMANIS_WEBHOOK_URL || '').trim();
  if (webhook) {
    const subject = db.subjects.find(s => s.id === schedule.subject_id);
    fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.SIMANIS_TOKEN ? { Authorization: `Bearer ${process.env.SIMANIS_TOKEN}` } : {}) },
      body: JSON.stringify({
        source: 'Geo Edulabs',
        tenant_id: req.tenantId,
        tanggal,
        kelas: classItem.nama,
        mapel: subject ? subject.nama : '',
        jam_mulai: schedule.jam_mulai,
        jam_selesai: schedule.jam_selesai,
        materi: entry.materi,
        kegiatan: entry.kegiatan,
        attendance: entry.attendance
      })
    }).catch(error => console.error('Kirim jurnal ke SIMANIS gagal:', error));
  }

  res.json({ success: true, entry });
});

app.get('/api/admin/simanis/export', requireAuth, requireStaff, requireTenant, async (req, res) => {
  const db = await loadDB();
  const tanggal = String(req.query.tanggal || wibNow().date);
  const tenant = db.tenants.find(t => t.id === req.tenantId) || {};
  const rows = [];
  (db.jurnal || [])
    .filter(j => j.tenant_id === req.tenantId && j.tanggal === tanggal)
    .forEach(j => {
      const classItem = db.classes.find(c => c.id === j.class_id);
      const schedule = db.schedules.find(s => s.id === j.schedule_id);
      const subject = schedule && db.subjects.find(s => s.id === schedule.subject_id);
      (j.attendance || []).forEach(a => {
        rows.push({
          tanggal,
          nis: a.nis || '',
          nama: a.nama || '',
          kelas: classItem ? classItem.nama : '',
          mapel: subject ? subject.nama : '',
          jam_mulai: schedule ? schedule.jam_mulai : '',
          jam_selesai: schedule ? schedule.jam_selesai : '',
          status: a.status || '',
          keterangan: a.keterangan || '',
          materi: j.materi || '',
          kegiatan: j.kegiatan || '',
          sekolah: tenant.nama || ''
        });
      });
    });
  res.json({ source: 'Geo Edulabs', tanggal, sekolah: tenant.nama || '', total: rows.length, rows });
});

app.get('/api/admin/sessions', requireAuth, requireAdmin, async (req, res) => {
  const db = await loadDB();
  const now = Date.now();
  const rows = (db.session_logs || [])
    .filter(s => req.user.role === 'super_admin' || s.tenant_id === req.tenantId)
    .map(s => ({
      id: s.id,
      user_id: s.user_id,
      nama: s.nama || '',
      email: s.email || '',
      role: s.role || '',
      nis: s.nis || '',
      kelas_nama: s.kelas_nama || '',
      ip: s.ip || '',
      lokasi: s.lokasi || '',
      geo_lat: s.geo_lat ?? null,
      geo_lng: s.geo_lng ?? null,
      geo_accuracy: s.geo_accuracy ?? null,
      geo_source: s.geo_source || '',
      ua: s.ua || '',
      login_at: s.login_at || null,
      last_seen_at: s.last_seen_at || null,
      logout_at: s.logout_at || null,
      active: !!s.active,
      detik_lalu: s.last_seen_at ? Math.max(0, Math.round((now - new Date(s.last_seen_at).getTime()) / 1000)) : null,
      online: !!s.active && now - new Date(s.last_seen_at || 0).getTime() < SESSION_ONLINE_MS
    }))
    .sort((a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0))
    .slice(0, 1000);
  res.json({
    online_window_minutes: SESSION_ONLINE_MS / 60000,
    online_count: rows.filter(r => r.online).length,
    server_time: new Date().toISOString(),
    sessions: rows
  });
});

// ===== SUBJECTS (Mapel) =====
app.get('/api/subjects', requireAuth, requireTenant, async (req, res) => {
  const cacheKey = `subjects:${req.tenantId}`;
  let subjects = await cacheGet(cacheKey);
  
  if (!subjects) {
    const db = await loadDB();
    subjects = db.subjects
      .filter(s => s.tenant_id === req.tenantId)
      .map(s => ({
        id: s.id,
        nama: s.nama,
        kode: s.kode,
        deskripsi: s.deskripsi,
        created_at: s.created_at
      }));
    await cacheSet(cacheKey, subjects, 600);
  }
  
  res.json(subjects);
});

app.post('/api/subjects', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { nama, kode, deskripsi } = req.body;
  const db = await loadDB();
  
  const subject = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    nama,
    kode,
    deskripsi,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.subjects.push(subject);
  await saveDB(db);
  
  await cacheDel(`subjects:${req.tenantId}`);
  res.json(subject);
});

app.put('/api/subjects/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const subject = db.subjects.find(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  
  const { nama, kode, deskripsi } = req.body;
  subject.nama = nama;
  subject.kode = kode;
  subject.deskripsi = deskripsi;
  
  await saveDB(db);
  await cacheDel(`subjects:${req.tenantId}`);
  res.json(subject);
});

app.delete('/api/subjects/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.subjects.findIndex(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.subjects.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`subjects:${req.tenantId}`);
  }
  
  res.json({ success: true });
});

// ===== CLASSES =====
app.get('/api/classes', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const classes = db.classes
    .filter(c => c.tenant_id === req.tenantId)
    .map(c => {
      const ketua = c.ketua_id ? db.students.find(s => s.id === c.ketua_id) : null;
      return {
        id: c.id,
        nama: c.nama,
        tingkat: c.tingkat,
        jurusan: c.jurusan,
        wali_kelas: c.wali_kelas,
        ketua_id: c.ketua_id || '',
        ketua_nama: ketua ? ketua.nama : '',
        created_at: c.created_at
      };
    });
  res.json(classes);
});

// Tunjuk satu siswa sebagai ketua kelas (hanya admin).
app.put('/api/classes/:id/ketua', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const classItem = db.classes.find(c => c.id === req.params.id && c.tenant_id === req.tenantId);
  if (!classItem) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
  const studentId = String(req.body?.student_id || '');
  if (!studentId) {
    classItem.ketua_id = '';
    await saveDB(db);
    await cacheDel(`classes:${req.tenantId}`);
    return res.json({ success: true, ketua_id: '' });
  }
  const student = db.students.find(s => s.id === studentId && s.tenant_id === req.tenantId);
  if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
  if (student.class_id !== classItem.id) {
    return res.status(400).json({ error: 'Siswa bukan anggota kelas ini' });
  }
  // Satu ketua per kelas; hapus penugasan lama di kelas lain bila ada.
  db.classes.forEach(c => { if (c.ketua_id === student.id) c.ketua_id = ''; });
  classItem.ketua_id = student.id;
  student.is_ketua = true;
  db.activity_logs.push(makeActivityRecord(db, req, req.user, 'Menetapkan ketua kelas', `${classItem.nama}: ${student.nama}`));
  await saveDB(db);
  await cacheDel(`classes:${req.tenantId}`);
  res.json({ success: true, ketua_id: student.id, ketua_nama: student.nama });
});

app.post('/api/classes', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { nama, tingkat, jurusan, wali_kelas } = req.body;
  const db = await loadDB();
  
  const classItem = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    nama,
    tingkat,
    jurusan,
    wali_kelas,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.classes.push(classItem);
  await saveDB(db);
  
  await cacheDel(`classes:${req.tenantId}`);
  res.json(classItem);
});

app.put('/api/classes/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const classItem = db.classes.find(c => c.id === req.params.id && c.tenant_id === req.tenantId);
  
  if (!classItem) return res.status(404).json({ error: 'Class not found' });
  
  const { nama, tingkat, jurusan, wali_kelas } = req.body;
  classItem.nama = nama;
  classItem.tingkat = tingkat;
  classItem.jurusan = jurusan;
  classItem.wali_kelas = wali_kelas;
  
  await saveDB(db);
  await cacheDel(`classes:${req.tenantId}`);
  res.json(classItem);
});

app.delete('/api/classes/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.classes.findIndex(c => c.id === req.params.id && c.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.classes.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`classes:${req.tenantId}`);
  }
  
  res.json({ success: true });
});

// ===== STUDENTS =====
function normalizeWa(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

app.get('/api/students', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const students = db.students
    .filter(s => s.tenant_id === req.tenantId)
    .map(s => {
      const classItem = db.classes.find(c => c.id === s.class_id);
      return {
        id: s.id,
        nama: s.nama,
        nis: s.nis,
        nisn: s.nisn || '',
        email: s.email,
        no_wa: s.no_wa || '',
        kelas_id: s.class_id,
        kelas_nama: classItem ? classItem.nama : '-',
        created_at: s.created_at
      };
    });
  res.json(students);
});

app.post('/api/students', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { nama, nis, nisn, email, class_id, no_wa } = req.body;
  const db = await loadDB();

  // Verify class belongs to tenant
  const classItem = db.classes.find(c => c.id === class_id && c.tenant_id === req.tenantId);
  if (!classItem) return res.status(400).json({ error: 'Invalid class' });

  const plainPassword = String(req.body.password || '').trim() || String(nis || '').trim() || generatePassword();

  const student = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    nama,
    nis,
    nisn: String(nisn || '').trim(),
    email,
    no_wa: normalizeWa(no_wa),
    class_id,
    username: req.body.username || email,
    password: bcrypt.hashSync(plainPassword, 10),
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };

  db.students.push(student);
  await saveDB(db);

  res.json({ ...student, password: plainPassword });
});

app.put('/api/students/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const student = db.students.find(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (!student) return res.status(404).json({ error: 'Student not found' });
  
  const { nama, nis, nisn, email, class_id, no_wa } = req.body;
  
  // Verify class belongs to tenant
  if (class_id) {
    const classItem = db.classes.find(c => c.id === class_id && c.tenant_id === req.tenantId);
    if (!classItem) return res.status(400).json({ error: 'Invalid class' });
    student.class_id = class_id;
  }
  
  student.nama = nama;
  student.nis = nis;
  if (nisn !== undefined) student.nisn = String(nisn || '').trim();
  student.email = email;
  if (no_wa !== undefined) student.no_wa = normalizeWa(no_wa);
  
  await saveDB(db);
  res.json(student);
});

app.delete('/api/students/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.students.findIndex(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.students.splice(idx, 1);
    await saveDB(db);
  }
  
  res.json({ success: true });
});

app.post('/api/students/import', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const rows = Array.isArray(req.body.students) ? req.body.students : [];
  if (!rows.length) return res.status(400).json({ error: 'Tidak ada baris untuk diimpor' });
  
  const db = await loadDB();
  const classes = db.classes.filter(c => c.tenant_id === req.tenantId);
  const seen = new Set(
    db.students
      .filter(s => s.tenant_id === req.tenantId)
      .map(s => String(s.nis || '').trim().toLowerCase())
  );
  
  const result = { created: 0, skipped: 0, errors: [], credentials: [] };
  
  rows.forEach((row, i) => {
    const baris = i + 2;
    const nis = String(row.nis || '').trim();
    const nisn = String(row.nisn || '').trim();
    const nama = String(row.nama || '').trim();
    const email = String(row.email || '').trim();
    const no_wa = normalizeWa(row.no_wa);
    const kelasNama = String(row.kelas || '').trim();
    
    if (!nis || !nama) {
      result.errors.push({ baris, nis, error: 'NIS dan nama wajib diisi' });
      return;
    }
    if (seen.has(nis.toLowerCase())) {
      result.skipped++;
      return;
    }
    
    const classItem = classes.find(c => String(c.nama).trim().toLowerCase() === kelasNama.toLowerCase());
    if (!classItem) {
      result.errors.push({ baris, nis, error: `Kelas "${kelasNama || '-'}" tidak ditemukan` });
      return;
    }
    
    const username = email || nis;
    const plainPassword = String(row.password || '').trim() || nis || generatePassword();
    db.students.push({
      id: uuidv4(),
      tenant_id: req.tenantId,
      nama,
      nis,
      nisn,
      email,
      no_wa,
      class_id: classItem.id,
      username,
      password: bcrypt.hashSync(plainPassword, 10),
      created_by: req.user.id,
      created_at: new Date().toISOString()
    });
    
    seen.add(nis.toLowerCase());
    result.credentials.push({ nis, username, password: plainPassword });
    result.created++;
  });
  
  if (result.created) await saveDB(db);
  res.json(result);
});

// ===== MATERIALS =====
app.get('/api/materials', requireAuth, requireTenant, async (req, res) => {
  const { subject_id, class_id, semester } = req.query;
  const db = await loadDB();
  
  let materials = db.materials.filter(m => m.tenant_id === req.tenantId);

  if (req.user.role === 'student') {
    const student = db.students.find(s => s.id === req.studentId);
    const tenant = db.tenants.find(t => t.id === req.tenantId);
    const activeSemester = tenant && tenant.semester_aktif ? Number(tenant.semester_aktif) : 1;
    const myClass = student ? db.classes.find(c => c.id === student.class_id) : null;
    const levelIds = new Set(
      myClass
        ? db.classes.filter(c => c.tenant_id === req.tenantId && String(c.tingkat || '') === String(myClass.tingkat || '')).map(c => c.id)
        : [student ? student.class_id : null].filter(Boolean)
    );
    materials = materials.filter(m =>
      levelIds.has(m.class_id) && Number(m.semester || 1) <= activeSemester
    );
  }
  
  if (subject_id) materials = materials.filter(m => m.subject_id === subject_id);
  if (class_id) {
    const mine = materials.filter(m => m.class_id === class_id);
    if (mine.length) {
      materials = mine;
    } else {
      // Kelas belum punya materi sendiri: pakai materi kelas lain pada tingkat yang sama
      const target = db.classes.find(c => c.id === class_id && c.tenant_id === req.tenantId);
      const tingkat = target ? String(target.tingkat || '') : '';
      const sameLevelIds = new Set(
        db.classes.filter(c => c.tenant_id === req.tenantId && String(c.tingkat || '') === tingkat).map(c => c.id)
      );
      materials = materials.filter(m => sameLevelIds.has(m.class_id));
    }
  }
  if (semester) materials = materials.filter(m => Number(m.semester || 1) === Number(semester));
  
  materials = materials.map(m => {
    const subject = db.subjects.find(s => s.id === m.subject_id);
    const classItem = db.classes.find(c => c.id === m.class_id);
    return {
      ...m,
      semester: Number(m.semester || 1),
      subject_nama: subject ? subject.nama : '-',
      class_nama: classItem ? classItem.nama : '-'
    };
  });
  
  res.json(materials.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/materials', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { judul, konten, subject_id, class_id, youtube_id, image, modul, tipe, semester } = req.body;
  const db = await loadDB();
  
  // Verify subject and class belong to tenant
  const subject = db.subjects.find(s => s.id === subject_id && s.tenant_id === req.tenantId);
  const classItem = db.classes.find(c => c.id === class_id && c.tenant_id === req.tenantId);
  
  if (!subject || !classItem) {
    return res.status(400).json({ error: 'Invalid subject or class' });
  }
  
  const material = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    judul,
    konten,
    subject_id,
    class_id,
    semester: Number(semester) === 2 ? 2 : 1,
    youtube_id: youtube_id || '',
    image: image || '',
    modul: modul || '',
    tipe: tipe || 'materi',
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.materials.push(material);
  await saveDB(db);
  
  await cacheDel(`materials:${req.tenantId}:${subject_id}:${class_id}`);
  res.json(material);
});

app.put('/api/materials/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const material = db.materials.find(m => m.id === req.params.id && m.tenant_id === req.tenantId);
  
  if (!material) return res.status(404).json({ error: 'Material not found' });
  
  const { judul, konten, subject_id, class_id, youtube_id, image, modul, tipe, semester } = req.body;
  
  // Verify subject and class belong to tenant
  if (subject_id || class_id) {
    const subject = db.subjects.find(s => s.id === (subject_id || material.subject_id) && s.tenant_id === req.tenantId);
    const classItem = db.classes.find(c => c.id === (class_id || material.class_id) && c.tenant_id === req.tenantId);
    if (!subject || !classItem) {
      return res.status(400).json({ error: 'Invalid subject or class' });
    }
  }
  
  material.judul = judul;
  material.konten = konten;
  material.subject_id = subject_id || material.subject_id;
  material.class_id = class_id || material.class_id;
  if (semester !== undefined) material.semester = Number(semester) === 2 ? 2 : 1;
  material.youtube_id = youtube_id !== undefined ? youtube_id : (material.youtube_id || '');
  material.image = image !== undefined ? image : (material.image || '');
  material.modul = modul !== undefined ? modul : (material.modul || '');
  material.tipe = tipe || material.tipe;
  
  await saveDB(db);
  await cacheDel(`materials:${req.tenantId}:${material.subject_id}:${material.class_id}`);
  res.json(material);
});

// ===== SEMESTER AKTIF TENANT =====
function currentAcademicYear(date = new Date()) {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

function normalizeAcademicYear(value) {
  const match = String(value || '').trim().match(/^(\d{4})\/(\d{4})$/);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) return null;
  return `${match[1]}/${match[2]}`;
}

app.get('/api/admin/semester-aktif', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const tenant = db.tenants.find(t => t.id === req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
  const activeYear = normalizeAcademicYear(tenant.tahun_pelajaran_aktif) || currentAcademicYear();
  const years = Array.isArray(tenant.tahun_pelajaran)
    ? tenant.tahun_pelajaran.map(normalizeAcademicYear).filter(Boolean)
    : [];
  if (!years.includes(activeYear)) years.push(activeYear);
  res.json({
    semester_aktif: Number(tenant.semester_aktif) === 2 ? 2 : 1,
    tahun_pelajaran_aktif: activeYear,
    tahun_pelajaran_options: [...new Set(years)]
  });
});

app.post('/api/admin/semester-aktif', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const tenant = db.tenants.find(t => t.id === req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
  const body = req.body || {};
  if (body.semester !== undefined && ![1, 2].includes(Number(body.semester))) {
    return res.status(400).json({ error: 'Semester harus 1 atau 2' });
  }
  const requestedYear = body.tahun_pelajaran_aktif === undefined
    ? null
    : normalizeAcademicYear(body.tahun_pelajaran_aktif);
  const addedYear = body.tambah_tahun_pelajaran === undefined
    ? null
    : normalizeAcademicYear(body.tambah_tahun_pelajaran);
  if (body.tahun_pelajaran_aktif !== undefined && !requestedYear) {
    return res.status(400).json({ error: 'Format tahun pelajaran tidak valid. Gunakan format YYYY/YYYY.' });
  }
  if (body.tambah_tahun_pelajaran !== undefined && !addedYear) {
    return res.status(400).json({ error: 'Tahun baru tidak valid. Gunakan format YYYY/YYYY berurutan.' });
  }

  const years = Array.isArray(tenant.tahun_pelajaran)
    ? tenant.tahun_pelajaran.map(normalizeAcademicYear).filter(Boolean)
    : [];
  const previousActiveYear = normalizeAcademicYear(tenant.tahun_pelajaran_aktif) || currentAcademicYear();
  if (!years.includes(previousActiveYear)) years.push(previousActiveYear);
  if (addedYear && !years.includes(addedYear)) years.push(addedYear);
  if (requestedYear && !years.includes(requestedYear)) {
    return res.status(400).json({ error: 'Tahun pelajaran belum terdaftar. Tambahkan terlebih dahulu.' });
  }

  if (body.semester !== undefined) tenant.semester_aktif = Number(body.semester);
  tenant.tahun_pelajaran = [...new Set(years)];
  if (addedYear) tenant.tahun_pelajaran_aktif = addedYear;
  else if (requestedYear) tenant.tahun_pelajaran_aktif = requestedYear;
  await saveDB(db);
  await cacheDel(`dashboard:${req.tenantId}`);
  res.json({
    success: true,
    semester_aktif: Number(tenant.semester_aktif) === 2 ? 2 : 1,
    tahun_pelajaran_aktif: tenant.tahun_pelajaran_aktif || previousActiveYear,
    tahun_pelajaran_options: tenant.tahun_pelajaran
  });
});

app.delete('/api/materials/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const material = db.materials.find(m => m.id === req.params.id && m.tenant_id === req.tenantId);
  
  if (material) {
    const idx = db.materials.indexOf(material);
    db.materials.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`materials:${req.tenantId}:${material.subject_id}:${material.class_id}`);
  }
  
  res.json({ success: true });
});

// ===== QUESTIONS =====
app.get('/api/questions', requireAuth, requireTenant, async (req, res) => {
  const { subject_id, jenis } = req.query;
  const db = await loadDB();
  
  let questions = db.questions.filter(q => q.tenant_id === req.tenantId);
  
  if (subject_id) questions = questions.filter(q => q.subject_id === subject_id);
  if (jenis) questions = questions.filter(q => q.jenis === jenis);
  
  res.json(questions);
});

app.post('/api/questions', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban, subject_id, jenis, poin, kelas } = req.body;
  const db = await loadDB();
  
  const question = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    pertanyaan,
    opsi_a,
    opsi_b,
    opsi_c,
    opsi_d,
    jawaban: parseInt(jawaban),
    subject_id,
    jenis: jenis || 'formatif',
    poin: parseInt(poin) || 10,
    kelas,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.questions.push(question);
  await saveDB(db);
  
  await cacheDel(`questions:${req.tenantId}:${subject_id}`);
  res.json(question);
});

app.put('/api/questions/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const question = db.questions.find(q => q.id === req.params.id && q.tenant_id === req.tenantId);
  
  if (!question) return res.status(404).json({ error: 'Question not found' });
  
  const { pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban, subject_id, jenis, poin, kelas } = req.body;
  question.pertanyaan = pertanyaan;
  question.opsi_a = opsi_a;
  question.opsi_b = opsi_b;
  question.opsi_c = opsi_c;
  question.opsi_d = opsi_d;
  question.jawaban = parseInt(jawaban);
  question.subject_id = subject_id || question.subject_id;
  question.jenis = jenis || question.jenis;
  question.poin = parseInt(poin) || question.poin;
  question.kelas = kelas;
  
  await saveDB(db);
  await cacheDel(`questions:${req.tenantId}:${question.subject_id}`);
  res.json(question);
});

app.delete('/api/questions/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const question = db.questions.find(q => q.id === req.params.id && q.tenant_id === req.tenantId);
  
  if (question) {
    const idx = db.questions.indexOf(question);
    db.questions.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`questions:${req.tenantId}:${question.subject_id}`);
  }
  
  res.json({ success: true });
});

// ===== EXAMS =====
app.get('/api/exams', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  let exams = db.exams.filter(e => e.tenant_id === req.tenantId);
  
  if (req.user.role === 'student') {
    const student = db.students.find(s => s.id === req.studentId);
    if (student) {
      exams = exams.filter(e => e.class_id === student.class_id);
    }
  }
  
  const result = exams.map(e => {
    const subject = db.subjects.find(s => s.id === e.subject_id);
    const classItem = db.classes.find(c => c.id === e.class_id);
    const questions = db.exam_questions
      .filter(eq => eq.exam_id === e.id)
      .map(eq => db.questions.find(q => q.id === eq.question_id))
      .filter(Boolean);
    return {
      ...e,
      subject_nama: subject ? subject.nama : '-',
      class_nama: classItem ? classItem.nama : '-',
      questions: req.user.role === 'student' ? questions.map(publicQuestion) : questions
    };
  });
  res.json(result);
});

// Siswa mengirim jawaban; skor dihitung di server agar `nilai` tidak bisa dipalsukan.
app.post('/api/exams/:id/submit', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const exam = db.exams.find(e => e.id === req.params.id && e.tenant_id === req.tenantId);
  if (!exam) return res.status(404).json({ error: 'Exam tidak ditemukan' });

  const isStudent = req.user.role === 'student';
  const studentId = isStudent ? req.studentId : req.body.student_id;
  if (!studentId) return res.status(400).json({ error: 'student_id wajib diisi' });
  const student = db.students.find(s => s.id === studentId && s.tenant_id === req.tenantId);
  if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

  const questionIds = db.exam_questions.filter(eq => eq.exam_id === exam.id).map(eq => eq.question_id);
  const questions = questionIds.map(id => db.questions.find(q => q.id === id)).filter(Boolean);
  if (!questions.length) return res.status(400).json({ error: 'Exam tidak memiliki soal' });

  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const picked = new Map(answers.map(a => [String(a.question_id), Number(a.jawaban)]));
  let benar = 0;
  questions.forEach(q => {
    const jawab = picked.get(String(q.id));
    if (Number.isInteger(jawab) && jawab === Number(q.jawaban)) benar++;
  });

  const nilai = Math.round((benar / questions.length) * 100);
  const grade = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    student_id: student.id,
    subject_id: exam.subject_id,
    class_id: exam.class_id,
    material_id: null,
    nilai,
    catatan: '',
    tipe: 'exam',
    exam_id: exam.id,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  db.grades.push(grade);
  await saveDB(db);
  await cacheDel(`grades:${req.tenantId}:${student.id}`);

  res.json({ success: true, nilai, benar, total: questions.length, grade });
});

app.post('/api/exams', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { judul, subject_id, class_id, durasi, question_ids } = req.body;
  const db = await loadDB();
  
  const exam = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    judul,
    subject_id,
    class_id,
    durasi: parseInt(durasi),
    aktif: true,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.exams.push(exam);
  
  for (const qid of question_ids) {
    db.exam_questions.push({
      exam_id: exam.id,
      question_id: qid
    });
  }
  
  await saveDB(db);
  await cacheDel(`exams:${req.tenantId}`);
  
  res.json(exam);
});

app.delete('/api/exams/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.exams.findIndex(e => e.id === req.params.id && e.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.exam_questions = db.exam_questions.filter(eq => eq.exam_id !== req.params.id);
    db.exams.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`exams:${req.tenantId}`);
  }
  
  res.json({ success: true });
});

// ===== GRADES =====
app.get('/api/grades', requireAuth, requireTenant, async (req, res) => {
  const { student_id, subject_id, class_id } = req.query;
  const db = await loadDB();
  const own = req.user.role === 'student' ? req.studentId : null;
  
  let grades = db.grades.filter(g => g.tenant_id === req.tenantId && (!own || g.student_id === own));
  
  if (student_id) grades = grades.filter(g => g.student_id === student_id);
  if (subject_id) grades = grades.filter(g => g.subject_id === subject_id);
  if (class_id) grades = grades.filter(g => g.class_id === class_id);
  
  const enriched = grades.map(g => {
    const student = db.students.find(s => s.id === g.student_id);
    const subject = db.subjects.find(s => s.id === g.subject_id);
    const classItem = db.classes.find(c => c.id === g.class_id);
    return {
      ...g,
      student_nama: student ? student.nama : '-',
      subject_nama: subject ? subject.nama : '-',
      class_nama: classItem ? classItem.nama : '-'
    };
  });

  const geografi = db.subjects.find(s => s.tenant_id === req.tenantId && /geografi/i.test(s.nama || ''));
  const { getBabTitle, summarizeAttempts } = require('./kurikulum');
  const attemptsByMaterial = new Map();
  db.attempts
    .filter(a => a.tenant_id === req.tenantId
      && (!own || a.student_id === own)
      && (!student_id || a.student_id === student_id)
      && (!subject_id || (geografi && geografi.id === subject_id)))
    .forEach(attempt => {
      const key = `${attempt.student_id}:${attempt.level}:${attempt.bab_id}`;
      if (!attemptsByMaterial.has(key)) attemptsByMaterial.set(key, []);
      attemptsByMaterial.get(key).push(attempt);
    })
  const curriculumGrades = [...attemptsByMaterial.values()].map(attempts => {
    const summary = summarizeAttempts(attempts);
    const latestAttempt = attempts.reduce((latest, attempt) =>
      new Date(attempt.created_at) > new Date(latest.created_at) ? attempt : latest
    );
    const student = db.students.find(s => s.id === latestAttempt.student_id);
    const classItem = student && db.classes.find(c => c.id === student.class_id);
    const title = getBabTitle(latestAttempt.bab_id, latestAttempt.level) || latestAttempt.bab_id;
    const penaltyText = summary.penalty_count
      ? `dikurangi ${summary.penalty_count} poin dari ${summary.penalty_count} pengulangan bernilai lebih rendah`
      : 'tanpa pengurangan nilai';
    const catatan = `${title} · nilai tertinggi ${summary.highest_score} pada pengulangan ke-${summary.highest_attempt} · ${penaltyText} · nilai akhir ${summary.best_score}`;
    if (class_id && (!classItem || classItem.id !== class_id)) return null;
    return {
      id: `kurikulum-${latestAttempt.student_id}-${latestAttempt.level}-${latestAttempt.bab_id}`,
      tenant_id: latestAttempt.tenant_id,
      student_id: latestAttempt.student_id,
      class_id: student ? student.class_id : null,
      subject_id: geografi ? geografi.id : null,
      nilai: summary.best_score,
      nilai_tertinggi: summary.highest_score,
      percobaan_nilai_tertinggi: summary.highest_attempt,
      pengurangan_nilai: summary.penalty_count,
      jumlah_percobaan: summary.attempts,
      kkm: 75,
      tipe: 'Materi Evaluasi',
      catatan,
      created_at: latestAttempt.created_at,
      student_nama: student ? student.nama : '-',
      subject_nama: geografi ? geografi.nama : 'Geografi',
      class_nama: classItem ? classItem.nama : '-'
    };
  }).filter(Boolean);
  
  res.json([...enriched, ...curriculumGrades].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/grades', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const isStudent = req.user.role === 'student';
  const { subject_id, class_id, nilai, catatan, tipe, material_id } = req.body;
  const student_id = isStudent ? req.studentId : req.body.student_id;
  
  const grade = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    student_id,
    subject_id,
    class_id,
    material_id: material_id || null,
    nilai: parseFloat(nilai),
    catatan: catatan || '',
    tipe: tipe || 'tugas',
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.grades.push(grade);
  await saveDB(db);
  
  await cacheDel(`grades:${req.tenantId}:${student_id}`);
  await cacheDel(`grades:${req.tenantId}:${subject_id}:${class_id}`);
  
  res.json(grade);
});

app.put('/api/grades/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const grade = db.grades.find(g => g.id === req.params.id && g.tenant_id === req.tenantId);
  
  if (!grade) return res.status(404).json({ error: 'Grade not found' });
  
  const { nilai, catatan, tipe } = req.body;
  grade.nilai = parseFloat(nilai);
  grade.catatan = catatan || '';
  grade.tipe = tipe || grade.tipe;
  
  await saveDB(db);
  await cacheDel(`grades:${req.tenantId}:${grade.student_id}`);
  await cacheDel(`grades:${req.tenantId}:${grade.subject_id}:${grade.class_id}`);
  
  res.json(grade);
});

app.delete('/api/grades/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const grade = db.grades.find(g => g.id === req.params.id && g.tenant_id === req.tenantId);
  
  if (grade) {
    const idx = db.grades.indexOf(grade);
    db.grades.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`grades:${req.tenantId}:${grade.student_id}`);
    await cacheDel(`grades:${req.tenantId}:${grade.subject_id}:${grade.class_id}`);
  }
  
  res.json({ success: true });
});

app.get('/api/admin/activity-log', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const events = (db.activity_logs || [])
    .filter(event => event.tenant_id === req.tenantId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 1000);
  res.json({ events });
});

// ===== DASHBOARD =====
app.get('/api/dashboard', requireAuth, requireTenant, async (req, res) => {
  const cacheKey = `dashboard:${req.tenantId}`;
  let stats = await cacheGet(cacheKey);
  
  if (!stats) {
    const db = await loadDB();
    const tenantId = req.tenantId;
    
    const siswa = db.students.filter(s => s.tenant_id === tenantId).length;
    const guru = db.users.filter(u => u.tenant_id === tenantId && u.role === 'teacher').length;
    const mapel = db.subjects.filter(s => s.tenant_id === tenantId).length;
    const kelas = db.classes.filter(c => c.tenant_id === tenantId).length;
    const materi = db.materials.filter(m => m.tenant_id === tenantId).length;
    const soal = db.questions.filter(q => q.tenant_id === tenantId).length;
    const nilai = db.grades.filter(g => g.tenant_id === tenantId).length;
    const exam = db.exams.filter(e => e.tenant_id === tenantId).length;
    
    const tenant = db.tenants.find(t => t.id === tenantId);
    
    const avgNilai = nilai > 0 
      ? Math.round((db.grades.filter(g => g.tenant_id === tenantId).reduce((s, g) => s + g.nilai, 0) / nilai) * 10) / 10 
      : 0;
    
    // Per kelas breakdown
    const perKelas = db.classes
      .filter(c => c.tenant_id === tenantId)
      .map(c => {
        const siswaKelas = db.students.filter(s => s.class_id === c.id).length;
        const nilaiKelas = db.grades.filter(g => g.class_id === c.id && g.tenant_id === tenantId);
        const rataKelas = nilaiKelas.length > 0 
          ? Math.round((nilaiKelas.reduce((s, g) => s + g.nilai, 0) / nilaiKelas.length) * 10) / 10
          : 0;
        return {
          id: c.id,
          nama: c.nama,
          tingkat: c.tingkat,
          siswa: siswaKelas,
          rata_nilai: rataKelas
        };
      });
    
    // Per mapel breakdown
    const perMapel = db.subjects
      .filter(s => s.tenant_id === tenantId)
      .map(s => ({
        id: s.id,
        nama: s.nama,
        kode: s.kode,
        materi: db.materials.filter(m => m.subject_id === s.id && m.tenant_id === tenantId).length,
        soal: db.questions.filter(q => q.subject_id === s.id && q.tenant_id === tenantId).length
      }));
    
    // Recent grades
    const recentGrades = db.grades
      .filter(g => g.tenant_id === tenantId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(g => {
        const student = db.students.find(s => s.id === g.student_id);
        const subject = db.subjects.find(s => s.id === g.subject_id);
        const classItem = db.classes.find(c => c.id === g.class_id);
        return {
          id: g.id,
          nilai: g.nilai,
          tipe: g.tipe,
          created_at: g.created_at,
          student_nama: student ? student.nama : '-',
          subject_nama: subject ? subject.nama : '-',
          class_nama: classItem ? classItem.nama : '-'
        };
      });
    
    stats = {
      siswa,
      guru,
      mapel,
      kelas,
      materi,
      soal,
      nilai,
      attendance: db.attendance.filter(a => a.tenant_id === tenantId).length,
      assignments: db.assignments.filter(a => a.tenant_id === tenantId).length,
      exam,
      rata_nilai: avgNilai,
      tenant_nama: tenant ? tenant.nama : '-',
      per_kelas: perKelas,
      per_mapel: perMapel,
      recent_grades: recentGrades
    };
    
    await cacheSet(cacheKey, stats, 120);
  }
  
  res.json(stats);
});

// ===== AUTH =====
app.post('/api/register', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, nama } = req.body;
  const role = ['teacher', 'student'].includes(req.body.role) ? req.body.role : 'teacher';
  const db = await loadDB();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const user = {
    id: uuidv4(),
    email,
    password: bcrypt.hashSync(password, 10),
    nama,
    role,
    // Guru/staf baru harus menempel ke sekolah agar langsung tampil di profil & dashboard.
    tenant_id: req.body.tenant_id
      || req.session.tenantId
      || ((db.tenants || []).length === 1 ? db.tenants[0].id : null)
  };
  
  db.users.push(user);
  await saveDB(db);

  res.json({
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    tenant_id: user.tenant_id
  });
});

// Admin: perbarui akun guru/staf (nama, peran, sekolah, atau password).
app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan' });
  if (user.role === 'student' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Akun siswa hanya dapat diubah super admin' });
  }

  if (req.body.nama !== undefined) user.nama = String(req.body.nama).trim().slice(0, 120);
  if (req.body.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email tidak valid' });
    }
    if (db.users.some(u => u.id !== user.id && String(u.email || '').toLowerCase() === email)) {
      return res.status(400).json({ error: 'Email sudah dipakai akun lain' });
    }
    user.email = email;
  }
  if (req.body.role !== undefined) {
    if (!['teacher', 'admin', 'super_admin'].includes(req.body.role)) {
      return res.status(400).json({ error: 'Peran tidak valid' });
    }
    if (req.body.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Hanya super admin dapat membuat super admin' });
    }
    user.role = req.body.role;
  }
  if (req.body.tenant_id !== undefined) {
    const target = req.body.tenant_id ? db.tenants.find(t => t.id === req.body.tenant_id) : null;
    if (req.body.tenant_id && !target) return res.status(400).json({ error: 'Tenant tidak ditemukan' });
    user.tenant_id = target ? target.id : null;
  }
  if (req.body.password) {
    if (String(req.body.password).length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter' });
    }
    user.password = bcrypt.hashSync(String(req.body.password), 10);
    delete user.password_changed_at;
  }
  user.updated_at = new Date().toISOString();
  await saveDB(db);
  res.json({
    success: true,
    user: { id: user.id, email: user.email, nama: user.nama, role: user.role, tenant_id: user.tenant_id }
  });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const lockKey = await guardLogin(req, res, email);
  if (!lockKey) return;

  const db = await loadDB();
  const user = db.users.find(u => u.email === email);

  // Bandingkan tetap dengan hash (dummy bila user tidak ada) agar waktu respons seragam.
  const passwordOk = bcrypt.compareSync(String(password || ''), user ? user.password : DUMMY_HASH);
  if (!user || !passwordOk) {
    await loginFail(lockKey);
    return res.status(401).json({ error: 'Email atau password salah' });
  }

  await loginSuccess(lockKey);
  
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.nama = user.nama;
  req.session.tenantId = user.tenant_id;
  // Akun tanpa tenant (mis. super admin / guru yang dibuat tanpa tenant): bila sekolah
  // hanya satu, pilih otomatis agar tidak perlu memilih manual dan data langsung tampil.
  if (!req.session.tenantId && ['super_admin', 'admin', 'teacher'].includes(user.role)
    && (db.tenants || []).length === 1) {
    req.session.tenantId = db.tenants[0].id;
  }
  req.session.sid = uuidv4();
  touchSession(db, req, user);
  db.activity_logs.push(makeActivityRecord(db, req, user, 'Login berhasil', 'Sesi dimulai'));
  await saveDB(db);
  
  res.json({
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    tenant_id: user.tenant_id
  });
});

// Student login with username/password
// ===== HELPER LOGIN =====
// Siswa bisa dikenali lewat username, NIS, NISN, atau email.
function findStudentByIdentifier(db, identifier) {
  const ident = String(identifier || '').trim();
  if (!ident) return null;
  const needle = ident.toLowerCase();
  return db.students.find(s => s.tenant_id && (
    String(s.username || '').trim().toLowerCase() === needle
    || String(s.nis || '').trim() === ident
    || String(s.nisn || '').trim() === ident
    || (s.email && String(s.email).trim().toLowerCase() === needle)
  )) || null;
}

// Staf (super_admin/admin/teacher) dikenali lewat email atau username.
function findStaffByIdentifier(db, identifier) {
  const needle = String(identifier || '').trim().toLowerCase();
  if (!needle) return null;
  return db.users.find(u => u.role !== 'student' && (
    (u.email && String(u.email).trim().toLowerCase() === needle)
    || (u.username && String(u.username).trim().toLowerCase() === needle)
  )) || null;
}

// Verifikasi password siswa; buat baris users bila belum ada. null = password salah.
async function verifyStudentPassword(db, student, password) {
  const plain = String(password || '');
  let user = db.users.find(u => u.role === 'student' && u.id === student.user_id)
    || (student.email ? db.users.find(u => u.email === student.email && u.role === 'student') : null);

  if (user) {
    return bcrypt.compareSync(plain, user.password) ? user : null;
  }
  if (!student.password || !bcrypt.compareSync(plain, student.password)) return null;

  user = {
    id: uuidv4(),
    email: student.email || `${student.nis}@siswa.local`,
    password: student.password,
    nama: student.nama,
    role: 'student',
    tenant_id: student.tenant_id,
    student_id: student.id,
    password_changed_at: student.password_changed_at || null,
    created_at: new Date().toISOString()
  };
  db.users.push(user);
  student.user_id = user.id;
  await saveDB(db);
  return user;
}

app.post('/api/student/login', async (req, res) => {
  const { username, password } = req.body;
  const lockKey = await guardLogin(req, res, username);
  if (!lockKey) return;

  const db = await loadDB();

  const student = findStudentByIdentifier(db, username);
  if (!student) {
    bcrypt.compareSync(String(password || ''), DUMMY_HASH);
    await loginFail(lockKey);
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const user = await verifyStudentPassword(db, student, password);
  if (!user) {
    await loginFail(lockKey);
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  await loginSuccess(lockKey);
  
  req.session.userId = user.id;
  req.session.role = 'student';
  req.session.nama = student.nama;
  req.session.tenantId = student.tenant_id;
  req.session.sid = uuidv4();
  touchSession(db, req, user);
  db.activity_logs.push(makeActivityRecord(db, req, user, 'Login berhasil', 'Sesi siswa dimulai'));
  await saveDB(db);
  
  res.json({
    id: user.id,
    student_id: student.id,
    nama: student.nama,
    role: 'student',
    tenant_id: student.tenant_id,
    class_id: student.class_id,
    nis: student.nis
  });
});

// Login tunggal: satu form untuk semua peran, jenis akun dideteksi otomatis.
app.post('/api/auth/login', async (req, res) => {
  const body = req.body || {};
  const identifier = String(body.identifier ?? body.email ?? body.username ?? '').trim();
  const password = String(body.password || '');
  // Password yang benar selalu diizinkan agar pengguna sah tidak terkunci.
  const lockKey = loginKey(req, identifier);
  const failResponse = async () => {
    await loginFail(lockKey);
    const left = await loginLockMs(lockKey);
    if (left > 0) {
      res.set('Retry-After', String(Math.ceil(left / 1000)));
      return res.status(429).json({
        error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(left / 1000)} detik.`,
        retry_after: Math.ceil(left / 1000)
      });
    }
    return res.status(401).json({ error: 'Identitas atau password salah' });
  };

  const db = await loadDB();
  const staff = findStaffByIdentifier(db, identifier);
  let student = null;
  let user = null;

  if (staff) {
    if (!bcrypt.compareSync(password, staff.password)) {
      return failResponse();
    }
    user = staff;
  } else {
    student = findStudentByIdentifier(db, identifier);
    user = student ? await verifyStudentPassword(db, student, password) : null;
    if (!user) {
      if (!student) bcrypt.compareSync(password, DUMMY_HASH);
      return failResponse();
    }
  }

  await loginSuccess(lockKey);
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.nama = student ? student.nama : user.nama;
  req.session.tenantId = user.tenant_id;
  req.session.sid = uuidv4();
  touchSession(db, req, user);
  db.activity_logs.push(makeActivityRecord(db, req, user, 'Login berhasil', 'Sesi dimulai'));
  if (student) {
    const auto = autoPresensiFromGeo(db, user, student, clientMeta(req));
    if (auto) {
      db.activity_logs.push(makeActivityRecord(db, req, user, 'Presensi otomatis', `Dalam radius ${auto.jarak} m dari sekolah`));
    }
  }
  await saveDB(db);

  const payload = {
    id: user.id,
    nama: req.session.nama,
    role: user.role,
    tenant_id: user.tenant_id
  };
  if (user.email) payload.email = user.email;
  if (student) {
    payload.student_id = student.id;
    payload.class_id = student.class_id;
    payload.nis = student.nis;
    payload.is_ketua = !!ketuaClassOf(db, student.id);
    payload.whatsapp = student.whatsapp || '';
  }
  res.json(payload);
});

// Nomor WhatsApp siswa untuk notifikasi tugas & evaluasi.
app.post('/api/me/whatsapp', requireAuth, async (req, res) => {
  const normalized = whatsappSender.normalizePhone(req.body?.whatsapp);
  if (!normalized) {
    return res.status(400).json({ error: 'Nomor WhatsApp tidak valid. Gunakan format 08…, +62…, atau 62…' });
  }
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.whatsapp = normalized;
  const student = db.students.find(s => s.user_id === user.id || (user.student_id && s.id === user.student_id));
  if (student) {
    student.whatsapp = normalized;
    student.whatsapp_updated_at = new Date().toISOString();
  }
  db.activity_logs.push(makeActivityRecord(db, req, user, 'Simpan nomor WhatsApp', `Nomor ${normalized}`));
  await saveDB(db);
  res.json({ success: true, whatsapp: normalized });
});

// Ganti password sendiri (semua role; siswa diizinkan lewat allowlist).
app.post('/api/me/password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
  }
  if (String(new_password).length < 8) {
    return res.status(400).json({ error: 'Password baru minimal 8 karakter' });
  }

  const db = await loadDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user || !bcrypt.compareSync(String(current_password), user.password)) {
    return res.status(400).json({ error: 'Password lama salah' });
  }

  user.password = bcrypt.hashSync(String(new_password), 10);
  user.password_changed_at = new Date().toISOString();
  const student = db.students.find(s => s.user_id === user.id || (user.student_id && s.id === user.student_id));
  if (student) {
    student.password = user.password;
    student.password_changed_at = user.password_changed_at;
  }
  await saveDB(db);

  res.json({ success: true });
});

// Admin: reset password satu siswa, password acak dikembalikan sekali.
app.post('/api/students/:id/reset-password', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const student = db.students.find(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

  const plain = generatePassword();
  const hash = bcrypt.hashSync(plain, 10);
  student.password = hash;
  delete student.password_changed_at;
  const linked = db.users.find(u => u.role === 'student' && (u.id === student.user_id || (student.email && u.email === student.email)));
  if (linked) {
    linked.password = hash;
    delete linked.password_changed_at;
  }
  await saveDB(db);

  res.json({ success: true, id: student.id, nis: student.nis, username: student.username || student.email || student.nis, password: plain });
});

// Admin: reset password massal (semua siswa tenant, atau satu kelas).
app.post('/api/students/reset-passwords', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const classId = req.body && req.body.class_id;
  const targets = db.students.filter(s => s.tenant_id === req.tenantId && (!classId || s.class_id === classId));
  if (!targets.length) return res.status(404).json({ error: 'Tidak ada siswa yang cocok' });

  const credentials = targets.map(student => {
    const plain = generatePassword();
    const hash = bcrypt.hashSync(plain, 10);
    student.password = hash;
    delete student.password_changed_at;
    const linked = db.users.find(u => u.role === 'student' && (u.id === student.user_id || (student.email && u.email === student.email)));
    if (linked) {
      linked.password = hash;
      delete linked.password_changed_at;
    }
    return { nis: student.nis, username: student.username || student.email || student.nis, password: plain };
  });

  await saveDB(db);
  res.json({ success: true, total: credentials.length, credentials });
});

app.post('/api/logout', async (req, res) => {
  const sid = req.session && req.session.sid;
  if (sid) {
    const db = await loadDB();
    const rec = (db.session_logs || []).find(s => s.id === sid);
    if (rec) {
      rec.active = false;
      rec.logout_at = new Date().toISOString();
      const user = db.users.find(item => item.id === rec.user_id);
      if (user) db.activity_logs.push(makeActivityRecord(db, req, user, 'Logout', 'Sesi berakhir'));
      await saveDB(db);
    }
  }
  req.session = null;
  res.json({ success: true });
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const resp = {
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    tenant_id: req.session.tenantId || user.tenant_id
  };
  
  if (user.role === 'student') {
    const student = db.students.find(s =>
      (!user.tenant_id || s.tenant_id === user.tenant_id) &&
      (s.user_id === user.id || s.id === user.student_id || (user.email && s.email === user.email))
    );
    if (student) {
      resp.password_changed_at = user.password_changed_at || student.password_changed_at || null;
      resp.whatsapp = student.whatsapp || user.whatsapp || '';
      resp.is_ketua = !!ketuaClassOf(db, student.id);
      const classItem = db.classes.find(c => c.id === student.class_id);
      resp.student_id = student.id;
      resp.class_id = student.class_id;
      resp.nis = student.nis;
      resp.kelas_nama = classItem ? classItem.nama : '-';
      resp.kelas_level = String(student.kelas_level || (classItem && classItem.tingkat) || '').toUpperCase();
      // Nama guru yang ditampilkan di profil: guru pengampu jadwal kelas, lalu guru tenant.
      const jadwalGuru = (db.schedules || []).find(s => s.class_id === student.class_id && s.guru && String(s.guru).trim());
      const guruTenant = (db.users || []).find(u => u.role === 'teacher'
        && (!student.tenant_id || u.tenant_id === student.tenant_id) && u.nama);
      resp.wali_kelas = (jadwalGuru && String(jadwalGuru.guru).trim())
        || (classItem && classItem.wali_kelas)
        || (guruTenant && guruTenant.nama)
        || '';
    }
  } else {
    resp.password_changed_at = user.password_changed_at || null;
  }
  
  res.json(resp);
});

// ===== ATTENDANCE =====
app.get('/api/attendance', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const own = req.user.role === 'student' ? req.studentId : null;
  const attendance = db.attendance
    .filter(a => a.tenant_id === req.tenantId && (!own || a.student_id === own))
    .slice().reverse()
    .slice(0, 200)
    .map(a => {
      const student = db.students.find(s => s.id === a.student_id);
      const classItem = db.classes.find(c => c.id === a.kelas_id);
      return {
        ...a,
        student_nama: student ? student.nama : '-',
        kelas_nama: classItem ? classItem.nama : '-'
      };
    });
  res.json(attendance);
});

app.post('/api/attendance', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { student_id, date, kelas_id, status, note } = req.body;
  const db = await loadDB();
  
  const attendance = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    student_id,
    date: date || new Date().toISOString().split('T')[0],
    kelas_id,
    status: status || 'hadir',
    note: note || '',
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.attendance.push(attendance);
  await saveDB(db);
  
  await cacheDel(`attendance:${req.tenantId}:${kelas_id}`);
  res.json(attendance);
});

app.delete('/api/attendance/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.attendance.findIndex(a => a.id === req.params.id && a.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.attendance.splice(idx, 1);
    await saveDB(db);
  }
  
  res.json({ success: true });
});

// ===== ASSIGNMENTS =====
app.get('/api/assignments', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  let assignments = db.assignments.filter(a => a.tenant_id === req.tenantId);

  if (req.user.role === 'student') {
    const student = db.students.find(s => s.id === req.studentId);
    if (student) assignments = assignments.filter(a => a.class_id === student.class_id);
  }

  const result = assignments
    .map(a => {
      const subject = db.subjects.find(s => s.id === a.subject_id);
      const classItem = db.classes.find(c => c.id === a.class_id);
      return {
        ...a,
        subject_nama: subject ? subject.nama : '-',
        class_nama: classItem ? classItem.nama : '-'
      };
    });
  res.json(result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/assignments', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { judul, deskripsi, subject_id, class_id, due_date, poin } = req.body;
  const db = await loadDB();
  
  const assignment = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    judul,
    deskripsi,
    subject_id,
    class_id,
    due_date: due_date || '',
    poin: parseInt(poin) || 100,
    aktif: true,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.assignments.push(assignment);
  await saveDB(db);
  
  await cacheDel(`assignments:${req.tenantId}`);
  res.json(assignment);
});

app.put('/api/assignments/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const assignment = db.assignments.find(a => a.id === req.params.id && a.tenant_id === req.tenantId);
  
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  
  const { judul, deskripsi, subject_id, class_id, due_date, poin, aktif } = req.body;
  assignment.judul = judul;
  assignment.deskripsi = deskripsi;
  assignment.subject_id = subject_id || assignment.subject_id;
  assignment.class_id = class_id || assignment.class_id;
  assignment.due_date = due_date || assignment.due_date;
  assignment.poin = parseInt(poin) || assignment.poin;
  assignment.aktif = aktif !== undefined ? aktif : assignment.aktif;
  
  await saveDB(db);
  await cacheDel(`assignments:${req.tenantId}`);
  res.json(assignment);
});

app.delete('/api/assignments/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.assignments.findIndex(a => a.id === req.params.id && a.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.assignments.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`assignments:${req.tenantId}`);
  }
  
  res.json({ success: true });
});

// ===== SCHEDULES =====
app.get('/api/schedules', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const schedules = db.schedules
    .filter(s => s.tenant_id === req.tenantId)
    .map(s => {
      const subject = db.subjects.find(x => x.id === s.subject_id);
      const classItem = db.classes.find(c => c.id === s.class_id);
      return {
        ...s,
        subject_nama: subject ? subject.nama : '-',
        class_nama: classItem ? classItem.nama : '-'
      };
    });
  res.json(schedules.sort((a, b) => (a.hari || '').localeCompare(b.hari || '')));
});

app.post('/api/schedules', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const { hari, jam_mulai, jam_selesai, subject_id, class_id, ruangan, guru } = req.body;
  const db = await loadDB();
  
  const schedule = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    hari: hari || 'Senin',
    jam_mulai: jam_mulai || '07:00',
    jam_selesai: jam_selesai || '08:30',
    subject_id,
    class_id,
    ruangan: ruangan || '',
    guru: guru || '',
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.schedules.push(schedule);
  await saveDB(db);
  await cacheDel(`schedules:${req.tenantId}`);
  res.json(schedule);
});

app.put('/api/schedules/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const schedule = db.schedules.find(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (!schedule) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
  
  const { hari, jam_mulai, jam_selesai, subject_id, class_id, ruangan, guru } = req.body;
  schedule.hari = hari || schedule.hari;
  schedule.jam_mulai = jam_mulai || schedule.jam_mulai;
  schedule.jam_selesai = jam_selesai || schedule.jam_selesai;
  schedule.subject_id = subject_id || schedule.subject_id;
  schedule.class_id = class_id || schedule.class_id;
  schedule.ruangan = ruangan !== undefined ? ruangan : schedule.ruangan;
  schedule.guru = guru !== undefined ? guru : schedule.guru;
  
  await saveDB(db);
  await cacheDel(`schedules:${req.tenantId}`);
  res.json(schedule);
});

app.delete('/api/schedules/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.schedules.findIndex(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.schedules.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`schedules:${req.tenantId}`);
  }
  
  res.json({ success: true });
});

// ===== RESTORE (super admin) =====
// Memulihkan isi database dari berkas cadangan. Akun admin yang sedang aktif selalu dipertahankan.
app.post('/api/admin/restore', requireAuth, requireAdmin, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Hanya super admin yang dapat memulihkan database' });
  }

  const body = req.body || {};
  if (body.confirm !== 'RESTORE') {
    return res.status(400).json({ error: 'Konfirmasi "RESTORE" wajib dikirim' });
  }

  const payload = body.data;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: 'Payload data tidak valid' });
  }

  const db = await loadDB();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${DB_PATH}.backup-restore-${stamp}`;
  await fs.copyFile(DB_PATH, backupPath);

  const staff = db.users.filter(u => u.role === 'admin' || u.role === 'super_admin');
  const staffIds = new Set(staff.map(u => u.id));
  const staffEmails = new Set(staff.map(u => String(u.email || '').toLowerCase()));
  const incomingUsers = Array.isArray(payload.users) ? payload.users : [];
  db.users = staff.concat(incomingUsers.filter(u => u && !staffIds.has(u.id)
    && !staffEmails.has(String(u.email || '').toLowerCase())));

  const tables = ['tenants', 'subjects', 'classes', 'students', 'materials', 'questions', 'exams',
    'exam_questions', 'grades', 'assignments', 'attendance', 'schedules', 'progress', 'attempts',
    'session_logs', 'activity_logs', 'whatsapp_jobs', 'whatsapp_logs', 'jurnal'];
  const counts = {};
  tables.forEach(k => {
    if (!Array.isArray(payload[k])) return;
    db[k] = payload[k];
    counts[k] = payload[k].length;
  });
  counts.users = db.users.length;

  await saveDB(db);
  res.json({ success: true, backup: path.basename(backupPath), counts });
});

// ===== SNAPSHOT BERKALA =====
// Salinan otomatis tiap 15 menit (default) agar pekerjaan siswa/guru tidak pernah
// hilang lebih dari satu interval, berapa pun penyebabnya.
const SNAPSHOT_INTERVAL_MS = Number(process.env.LMS_SNAPSHOT_INTERVAL_MS || 15 * 60 * 1000);
const SNAPSHOT_KEEP = Number(process.env.LMS_SNAPSHOT_KEEP || 48);

async function snapshotDB() {
  try {
    const current = await loadDB();
    if (!dataStore.hasData(current)) return; // jangan simpan keadaan kosong
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = path.dirname(DB_PATH);
    const prefix = `${path.basename(DB_PATH)}.snap-`;
    await fs.writeFile(path.join(dir, `${prefix}${stamp}`), JSON.stringify(current, null, 2));
    const files = (await fs.readdir(dir)).filter(f => f.startsWith(prefix)).sort();
    for (const f of files.slice(0, Math.max(0, files.length - SNAPSHOT_KEEP))) {
      await fs.unlink(path.join(dir, f)).catch(() => {});
    }
  } catch (error) {
    console.error('[db] Snapshot berkala gagal:', error.message);
  }
}

function startSnapshotScheduler() {
  if (!(SNAPSHOT_INTERVAL_MS > 0)) return;
  snapshotDB();
  const timer = setInterval(snapshotDB, SNAPSHOT_INTERVAL_MS);
  if (timer && typeof timer.unref === 'function') timer.unref();
}

// ===== DIAGNOSTIK & PEMULIHAN BERKAS (super admin) =====
// Membantu memeriksa cadangan dan memulihkannya tanpa harus masuk ke console server.
app.get('/api/admin/db-status', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Hanya super admin' });
  const dir = path.dirname(DB_PATH);
  const files = [];
  for (const name of (await fs.readdir(dir)).filter(n => n === 'db.json' || n.startsWith('db.json.'))) {
    const full = path.join(dir, name);
    try {
      const stat = await fs.stat(full);
      if (!stat.isFile()) continue;
      let counts = 'unreadable';
      try {
        const data = JSON.parse(await fs.readFile(full, 'utf-8'));
        counts = {
          users: (data.users || []).length,
          teachers: (data.users || []).filter(u => u.role === 'teacher').length,
          students: (data.students || []).length,
          exams: (data.exams || []).length,
          grades: (data.grades || []).length,
          attendance: (data.attendance || []).length,
          jurnal: (data.jurnal || []).length,
          attempts: (data.attempts || []).length,
          progress: (data.progress || []).length,
          whatsapp_logs: (data.whatsapp_logs || []).length
        };
      } catch { /* biarkan 'unreadable' */ }
      files.push({ file: name, size: stat.size, mtime: stat.mtime, counts });
    } catch { /* lewati berkas yang tidak terbaca */ }
  }
  files.sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)));
  const live = await loadDB().then(db => dataStore.countsOf(db)).catch(() => null);
  res.json({ path: DB_PATH, store: dataStore.status(), live, files });
});

app.post('/api/admin/restore-file', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Hanya super admin' });
  const body = req.body || {};
  if (body.confirm !== 'RESTORE-FILE') {
    return res.status(400).json({ error: 'Konfirmasi "RESTORE-FILE" wajib dikirim' });
  }
  const name = String(body.file || '').trim();
  if (!/^db\.json\.(backup|daily|prev|before|snap)[A-Za-z0-9._-]*$/.test(name)) {
    return res.status(400).json({ error: 'Nama berkas cadangan tidak valid' });
  }
  const source = path.join(path.dirname(DB_PATH), name);
  if (!(await fileExists(source))) return res.status(404).json({ error: 'Berkas cadangan tidak ditemukan' });
  let incoming;
  try {
    incoming = normalizeDB(JSON.parse(await fs.readFile(source, 'utf-8')));
  } catch (error) {
    return res.status(400).json({ error: 'Berkas cadangan rusak: ' + error.message });
  }
  const db = await loadDB();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.copyFile(DB_PATH, `${DB_PATH}.backup-before-file-restore-${stamp}`).catch(() => {});
  // Pertahankan akun staf yang sedang ada agar login tidak terputus setelah pemulihan.
  const staff = (db.users || []).filter(u => u.role === 'admin' || u.role === 'super_admin');
  const staffIds = new Set(staff.map(u => u.id));
  const staffEmails = new Set(staff.map(u => String(u.email || '').toLowerCase()));
  incoming.users = staff.concat((incoming.users || []).filter(u => u && !staffIds.has(u.id)
    && !staffEmails.has(String(u.email || '').toLowerCase())));
  await saveDB(incoming);
  res.json({
    success: true,
    source: name,
    counts: {
      users: incoming.users.length,
      teachers: incoming.users.filter(u => u.role === 'teacher').length,
      students: (incoming.students || []).length,
      exams: (incoming.exams || []).length,
      grades: (incoming.grades || []).length,
      attendance: (incoming.attendance || []).length,
      jurnal: (incoming.jurnal || []).length,
      attempts: (incoming.attempts || []).length
    }
  });
});

// ===== SEED =====
app.post('/api/seed', requireAuth, requireAdmin, requireTenant, async (req, res) => {
  const db = req.db;
  
  if (db.subjects.length > 0) {
    return res.json({ message: 'Data already exists' });
  }
  
  // Create tenant
  const tenant = {
    id: uuidv4(),
    nama: 'SMA Negeri 1 Jakarta',
    slug: 'sman1-jakarta',
    description: 'Sekolah contoh',
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  db.tenants.push(tenant);
  
  // Assign current admin to tenant
  req.user.tenant_id = tenant.id;
  await saveDB(db);
  
  // Update session
  req.session.tenantId = tenant.id;
  
  // Create subjects
  const subjects = [
    { id: uuidv4(), tenant_id: tenant.id, nama: 'Geografi', kode: 'GEO', deskripsi: 'Mata pelajaran Geografi', created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, nama: 'Matematika', kode: 'MAT', deskripsi: 'Mata pelajaran Matematika', created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, nama: 'Fisika', kode: 'FIS', deskripsi: 'Mata pelajaran Fisika', created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.subjects.push(...subjects);
  
  // Create classes
  const classes = [
    { id: uuidv4(), tenant_id: tenant.id, nama: 'X-A', tingkat: 'X', jurusan: 'IPA', wali_kelas: 'Guru A', created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, nama: 'XI-B', tingkat: 'XI', jurusan: 'IPS', wali_kelas: 'Guru B', created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.classes.push(...classes);
  
  // Create students
  const students = [
    { id: uuidv4(), tenant_id: tenant.id, nama: 'Siswa Test', nis: 'X000', email: 'siswa@test.com', class_id: classes[0].id, created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, nama: 'Ahmad Rizki', nis: 'X001', email: 'ahmad@test.com', class_id: classes[0].id, created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, nama: 'Budi Santoso', nis: 'X002', email: 'budi@test.com', class_id: classes[0].id, created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.students.push(...students);
  
  // Create materials
  const materials = [
    { id: uuidv4(), tenant_id: tenant.id, judul: 'Dasar-dasar Geografi', konten: '<h3>Apa itu Geografi?</h3><p>Geografi adalah ilmu yang mempelajari persebaran fenomena alam dan manusia di permukaan bumi (<strong>Budiardjo, 2014</strong>).</p>', subject_id: subjects[0].id, class_id: classes[0].id, youtube_id: '', image: '', modul: 'Modul 1', tipe: 'materi', created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, judul: 'Statistik Geografi', konten: '<h3>Statistik Deskriptif</h3><p>Diagram batang, lingkaran, garis.</p>', subject_id: subjects[0].id, class_id: classes[0].id, youtube_id: '', image: '', modul: 'Modul 2', tipe: 'materi', created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.materials.push(...materials);
  
  // Create questions
  const questions = [
    { id: uuidv4(), tenant_id: tenant.id, pertanyaan: 'Ilmu yang mempelajari persebaran fenomena alam dan manusia disebut?', opsi_a: 'Geografi', opsi_b: 'Astronomi', opsi_c: 'Geologi', opsi_d: 'Ekologi', jawaban: 0, subject_id: subjects[0].id, jenis: 'formatif', poin: 10, kelas: 'X', created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, pertanyaan: 'Diagram statistik untuk persentase?', opsi_a: 'Diagram batang', opsi_b: 'Diagram garis', opsi_c: 'Diagram lingkaran', opsi_d: 'Peta tematik', jawaban: 2, subject_id: subjects[0].id, jenis: 'sumatif', poin: 10, kelas: 'X', created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.questions.push(...questions);
  
  // Create attendance
  const attendance = [
    { id: uuidv4(), tenant_id: tenant.id, student_id: students[0].id, date: '2024-01-15', kelas_id: classes[0].id, status: 'hadir', note: '', created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, student_id: students[1].id, date: '2024-01-15', kelas_id: classes[0].id, status: 'hadir', note: '', created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.attendance.push(...attendance);
  
  // Create assignments
  const assignments = [
    { id: uuidv4(), tenant_id: tenant.id, judul: 'Analisis Peta Wilayah', deskripsi: 'Buat laporan analisis peta wilayah setempat.', subject_id: subjects[0].id, class_id: classes[0].id, due_date: '2024-01-20', poin: 100, aktif: true, created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.assignments.push(...assignments);
  
  // Create schedules
  const schedules = [
    { id: uuidv4(), tenant_id: tenant.id, hari: 'Senin', jam_mulai: '07:00', jam_selesai: '08:30', subject_id: subjects[0].id, class_id: classes[0].id, ruangan: 'R101', guru: 'Guru Geografi', created_by: req.user.id, created_at: new Date().toISOString() },
    { id: uuidv4(), tenant_id: tenant.id, hari: 'Selasa', jam_mulai: '07:00', jam_selesai: '08:30', subject_id: subjects[0].id, class_id: classes[0].id, ruangan: 'R101', guru: 'Guru Geografi', created_by: req.user.id, created_at: new Date().toISOString() }
  ];
  db.schedules.push(...schedules);
  
  await saveDB(db);
  
  // Clear all cache
  if (redis) {
    await redis.flushall();
  } else {
    cache.clear();
  }
  
  res.json({ 
    message: 'Data seeded successfully',
    tenant,
    subjects,
    classes,
    students,
    materials,
    questions
  });
});

// ===== START =====
require('./kurikulum').registerKurikulum(app, {
  loadDB,
  saveDB,
  requireAuth,
  requireTenant,
  requireAdmin,
  cacheDel,
  notifyStudent: (tenantId, studentId, text) => whatsappSender.notifyStudent(loadDB, saveDB, tenantId, studentId, text)
});
whatsappSender.registerWhatsAppRoutes(app, {
  loadDB,
  saveDB,
  requireAuth,
  requireAdmin,
  requireTenant
});

const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await dataStore.init({ dbPath: DB_PATH });
    const info = dataStore.status();
    console.log(`[db] backend=${info.backend}${info.sqlitePath ? ` (${info.sqlitePath})` : ''}`);
  } catch (error) {
    console.error('[db] Inisialisasi penyimpanan gagal:', error.message);
  }
  try {
    await initDB();
  } catch (error) {
    // Berkas DB ada tetapi rusak: jangan menyemai admin baru di atasnya.
    // Server tetap hidup agar admin bisa memakai /api/admin/db-status + restore-file.
    console.error('[db] Inisialisasi database gagal:', error.message);
  }
  app.listen(PORT, () => {
    console.log(`LMS Multi-Tenant running on http://localhost:${PORT}`);
  });
  startSnapshotScheduler();
  whatsappSender.startScheduler(loadDB, saveDB);
  whatsappSender.initializeWhatsApp(loadDB, saveDB).catch(error => {
    console.error('WhatsApp sender gagal diinisialisasi:', error);
  });
})();
