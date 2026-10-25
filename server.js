const bcrypt = require('bcryptjs');
const express = require('express');
const cookieSession = require('cookie-session');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const DB_PATH = path.join(__dirname, 'data', 'db.json');

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
  
  redis.on('connect', () => {
    console.log('Redis connected');
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

// ===== DATABASE =====
async function loadDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    ['users', 'tenants', 'subjects', 'classes', 'students', 'materials', 'questions', 'exams', 'exam_questions', 'grades', 'assignments', 'attendance', 'schedules', 'progress', 'attempts'].forEach(k => {
      if (!Array.isArray(db[k])) db[k] = [];
    });
    return db;
  } catch {
    return {
      users: [],
      tenants: [],
      subjects: [],
      classes: [],
      students: [],
      materials: [],
      questions: [],
      exams: [],
      exam_questions: [],
      grades: [],
      assignments: [],
      attendance: [],
      schedules: [],
      progress: [],
      attempts: []
    };
  }
}

async function saveDB(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

async function initDB() {
  const db = await loadDB();
  if (db.users.length === 0) {
    // Seed default super admin
    db.users.push({
      id: uuidv4(),
      email: 'admin@lms.id',
      password: bcrypt.hashSync('admin', 10),
      nama: 'Super Admin',
      role: 'super_admin',
      tenant_id: null
    });
    await saveDB(db);
  }
  return db;
}

// ===== MIDDLEWARE =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const SESSION_KEYS = (process.env.SESSION_SECRET || 'lms-secret-key-2024-multi-tenant')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);
app.use(cookieSession({
  name: 'lms_session',
  keys: SESSION_KEYS,
  maxAge: 7 * 24 * 60 * 60 * 1000
}));

// Auth middleware
async function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  req.db = db;
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
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

app.post('/api/subjects', requireAuth, requireTenant, async (req, res) => {
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

app.put('/api/subjects/:id', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/subjects/:id', requireAuth, requireTenant, async (req, res) => {
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
  const cacheKey = `classes:${req.tenantId}`;
  let classes = await cacheGet(cacheKey);
  
  if (!classes) {
    const db = await loadDB();
    classes = db.classes
      .filter(c => c.tenant_id === req.tenantId)
      .map(c => ({
        id: c.id,
        nama: c.nama,
        tingkat: c.tingkat,
        jurusan: c.jurusan,
       wali_kelas: c.wali_kelas,
        created_at: c.created_at
      }));
    await cacheSet(cacheKey, classes, 600);
  }
  
  res.json(classes);
});

app.post('/api/classes', requireAuth, requireTenant, async (req, res) => {
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

app.put('/api/classes/:id', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/classes/:id', requireAuth, requireTenant, async (req, res) => {
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
        email: s.email,
        no_wa: s.no_wa || '',
        kelas_id: s.class_id,
        kelas_nama: classItem ? classItem.nama : '-',
        created_at: s.created_at
      };
    });
  res.json(students);
});

app.post('/api/students', requireAuth, requireTenant, async (req, res) => {
  const { nama, nis, email, class_id, no_wa } = req.body;
  const db = await loadDB();
  
  // Verify class belongs to tenant
  const classItem = db.classes.find(c => c.id === class_id && c.tenant_id === req.tenantId);
  if (!classItem) return res.status(400).json({ error: 'Invalid class' });
  
  const student = {
    id: uuidv4(),
    tenant_id: req.tenantId,
    nama,
    nis,
    email,
    no_wa: normalizeWa(no_wa),
    class_id,
    username: req.body.username || email,
    password: bcrypt.hashSync(req.body.password || email, 10),
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };
  
  db.students.push(student);
  await saveDB(db);
  
  res.json(student);
});

app.put('/api/students/:id', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const student = db.students.find(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (!student) return res.status(404).json({ error: 'Student not found' });
  
  const { nama, nis, email, class_id, no_wa } = req.body;
  
  // Verify class belongs to tenant
  if (class_id) {
    const classItem = db.classes.find(c => c.id === class_id && c.tenant_id === req.tenantId);
    if (!classItem) return res.status(400).json({ error: 'Invalid class' });
    student.class_id = class_id;
  }
  
  student.nama = nama;
  student.nis = nis;
  student.email = email;
  if (no_wa !== undefined) student.no_wa = normalizeWa(no_wa);
  
  await saveDB(db);
  res.json(student);
});

app.delete('/api/students/:id', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.students.findIndex(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.students.splice(idx, 1);
    await saveDB(db);
  }
  
  res.json({ success: true });
});

app.post('/api/students/import', requireAuth, requireTenant, async (req, res) => {
  const rows = Array.isArray(req.body.students) ? req.body.students : [];
  if (!rows.length) return res.status(400).json({ error: 'Tidak ada baris untuk diimpor' });
  
  const db = await loadDB();
  const classes = db.classes.filter(c => c.tenant_id === req.tenantId);
  const seen = new Set(
    db.students
      .filter(s => s.tenant_id === req.tenantId)
      .map(s => String(s.nis || '').trim().toLowerCase())
  );
  
  const result = { created: 0, skipped: 0, errors: [] };
  
  rows.forEach((row, i) => {
    const baris = i + 2;
    const nis = String(row.nis || '').trim();
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
    db.students.push({
      id: uuidv4(),
      tenant_id: req.tenantId,
      nama,
      nis,
      email,
      no_wa,
      class_id: classItem.id,
      username,
      password: bcrypt.hashSync(username, 10),
      created_by: req.user.id,
      created_at: new Date().toISOString()
    });
    
    seen.add(nis.toLowerCase());
    result.created++;
  });
  
  if (result.created) await saveDB(db);
  res.json(result);
});

// ===== MATERIALS =====
app.get('/api/materials', requireAuth, requireTenant, async (req, res) => {
  const { subject_id, class_id } = req.query;
  const db = await loadDB();
  
  let materials = db.materials.filter(m => m.tenant_id === req.tenantId);
  
  if (subject_id) materials = materials.filter(m => m.subject_id === subject_id);
  if (class_id) materials = materials.filter(m => m.class_id === class_id);
  
  materials = materials.map(m => {
    const subject = db.subjects.find(s => s.id === m.subject_id);
    const classItem = db.classes.find(c => c.id === m.class_id);
    return {
      ...m,
      subject_nama: subject ? subject.nama : '-',
      class_nama: classItem ? classItem.nama : '-'
    };
  });
  
  res.json(materials.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/materials', requireAuth, requireTenant, async (req, res) => {
  const { judul, konten, subject_id, class_id, youtube_id, image, modul, tipe } = req.body;
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

app.put('/api/materials/:id', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const material = db.materials.find(m => m.id === req.params.id && m.tenant_id === req.tenantId);
  
  if (!material) return res.status(404).json({ error: 'Material not found' });
  
  const { judul, konten, subject_id, class_id, youtube_id, image, modul, tipe } = req.body;
  
  // Verify subject and class belong to tenant
  if (subject_id || class_id) {
    const subject = db.subjects.find(s => s.id === (subject_id || material.subject_id) && s.tenant_id === req.tenantId);
    const classItem = db.classes.find(c => c.id === (class_id || material.class_id) && s.tenant_id === req.tenantId);
    if (!subject || !classItem) {
      return res.status(400).json({ error: 'Invalid subject or class' });
    }
  }
  
  material.judul = judul;
  material.konten = konten;
  material.subject_id = subject_id || material.subject_id;
  material.class_id = class_id || material.class_id;
  material.youtube_id = youtube_id || '';
  material.image = image || '';
  material.modul = modul || '';
  material.tipe = tipe || material.tipe;
  
  await saveDB(db);
  await cacheDel(`materials:${req.tenantId}:${material.subject_id}:${material.class_id}`);
  res.json(material);
});

app.delete('/api/materials/:id', requireAuth, requireTenant, async (req, res) => {
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

app.post('/api/questions', requireAuth, requireTenant, async (req, res) => {
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

app.put('/api/questions/:id', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/questions/:id', requireAuth, requireTenant, async (req, res) => {
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
  const exams = db.exams
    .filter(e => e.tenant_id === req.tenantId)
    .map(e => {
      const subject = db.subjects.find(s => s.id === e.subject_id);
      const classItem = db.classes.find(c => c.id === e.class_id);
      const questions = db.exam_questions
        .filter(eq => eq.exam_id === e.id)
        .map(eq => db.questions.find(q => q.id === eq.question_id));
      return {
        ...e,
        subject_nama: subject ? subject.nama : '-',
        class_nama: classItem ? classItem.nama : '-',
        questions: questions.filter(Boolean)
      };
    });
  res.json(exams);
});

app.post('/api/exams', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/exams/:id', requireAuth, requireTenant, async (req, res) => {
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
  
  let grades = db.grades.filter(g => g.tenant_id === req.tenantId);
  
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
  
  res.json(enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/grades', requireAuth, requireTenant, async (req, res) => {
  const { student_id, subject_id, class_id, nilai, catatan, tipe, material_id } = req.body;
  const db = await loadDB();
  
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

app.put('/api/grades/:id', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/grades/:id', requireAuth, requireTenant, async (req, res) => {
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
app.post('/api/register', async (req, res) => {
  const { email, password, nama, role, tenant_id } = req.body;
  const db = await loadDB();
  
  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  const user = {
    id: uuidv4(),
    email,
    password: bcrypt.hashSync(password, 10),
    nama,
    role: role || 'teacher',
    tenant_id: tenant_id || null
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

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await loadDB();
  const user = db.users.find(u => u.email === email);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Email atau password salah' });
  }
  
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.nama = user.nama;
  req.session.tenantId = user.tenant_id;
  
  res.json({
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    tenant_id: user.tenant_id
  });
});

// Student login with username/password
app.post('/api/student/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await loadDB();
  
  // Find student by username or email
  const student = db.students.find(s => (s.username === username || s.email === username) && s.tenant_id);
  if (!student) {
    return res.status(401).json({ error: 'Username tidak ditemukan' });
  }
  
  // For demo, password is stored in users table with email matching
  const user = db.users.find(u => u.email === student.email && u.role === 'student');
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Password salah' });
  }
  
  req.session.userId = user.id;
  req.session.role = 'student';
  req.session.nama = student.nama;
  req.session.tenantId = student.tenant_id;
  
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

app.post('/api/logout', (req, res) => {
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
    tenant_id: user.tenant_id
  };
  
  if (user.role === 'student') {
    const student = db.students.find(s => s.tenant_id === user.tenant_id && s.email === user.email);
    if (student) {
      const classItem = db.classes.find(c => c.id === student.class_id);
      resp.student_id = student.id;
      resp.class_id = student.class_id;
      resp.nis = student.nis;
      resp.kelas_nama = classItem ? classItem.nama : '-';
    }
  }
  
  res.json(resp);
});

// ===== ATTENDANCE =====
app.get('/api/attendance', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const attendance = db.attendance
    .filter(a => a.tenant_id === req.tenantId)
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

app.post('/api/attendance', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/attendance/:id', requireAuth, requireTenant, async (req, res) => {
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
  const assignments = db.assignments
    .filter(a => a.tenant_id === req.tenantId)
    .map(a => {
      const subject = db.subjects.find(s => s.id === a.subject_id);
      const classItem = db.classes.find(c => c.id === a.class_id);
      return {
        ...a,
        subject_nama: subject ? subject.nama : '-',
        class_nama: classItem ? classItem.nama : '-'
      };
    });
  res.json(assignments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.post('/api/assignments', requireAuth, requireTenant, async (req, res) => {
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

app.put('/api/assignments/:id', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/assignments/:id', requireAuth, requireTenant, async (req, res) => {
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

app.post('/api/schedules', requireAuth, requireTenant, async (req, res) => {
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

app.put('/api/schedules/:id', requireAuth, requireTenant, async (req, res) => {
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

app.delete('/api/schedules/:id', requireAuth, requireTenant, async (req, res) => {
  const db = await loadDB();
  const idx = db.schedules.findIndex(s => s.id === req.params.id && s.tenant_id === req.tenantId);
  
  if (idx >= 0) {
    db.schedules.splice(idx, 1);
    await saveDB(db);
    await cacheDel(`schedules:${req.tenantId}`);
  }
  
  res.json({ success: true });
});

// ===== DASHBOARD =====
app.get('/api/dashboard', requireAuth, requireTenant, async (req, res) => {
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
  cacheDel
});

const PORT = process.env.PORT || 3000;
(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`LMS Multi-Tenant running on http://localhost:${PORT}`);
    console.log(`Default admin: admin@lms.id / admin`);
  });
})();
