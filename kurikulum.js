// ===== PEMBELAJARAN BERJENJANG (KURIKULUM GEOGRAFI) =====
// Modul terpisah agar server.js tetap ringkas. Dipasang lewat registerKurikulum().
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const KKM = 75;
const MAX_ATTEMPTS = 3;
const LEVELS = ['X', 'XI', 'XII'];
const CONTENT_DIR = path.join(__dirname, 'data', 'kurikulum');

const contentCache = new Map();
const lastMtime = new Map();

function loadLevel(level) {
  const dir = path.join(CONTENT_DIR, `kelas-${level.toLowerCase()}`);
  let babs = [];
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    let maxM = 0;
    for (const f of files) {
      try {
        const s = fs.statSync(path.join(dir, f));
        if (s.mtimeMs > maxM) maxM = s.mtimeMs;
      } catch (e) {}
    }
    if (contentCache.has(level) && lastMtime.get(level) === maxM) {
      return contentCache.get(level);
    }
    babs = files
      .map(f => {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
        return JSON.parse(raw);
      })
      .flat()
      .sort((a, b) => a.urutan - b.urutan);
    contentCache.set(level, babs);
    lastMtime.set(level, maxM);
  }
  return babs;
}

function publicBab(bab) {
  return {
    ...bab,
    soal: (bab.soal || []).map(s => {
      const { kunci, pembahasan, ...rest } = s;
      return rest;
    })
  };
}

function sameSet(a, b) {
  const x = [...new Set(a)].sort().join(',');
  const y = [...new Set(b)].sort().join(',');
  return x === y;
}

function gradeSoal(soal, jawaban) {
  if (jawaban === undefined || jawaban === null) return 0;
  switch (soal.tipe) {
    case 'pgm':
    case 'pg_singkat':
      return Number(jawaban) === Number(soal.kunci[0]) ? 1 : 0;
    case 'pg_kompleks':
      return sameSet(Array.isArray(jawaban) ? jawaban : [jawaban], soal.kunci) ? 1 : 0;
    case 'benar_salah': {
      const arr = Array.isArray(jawaban) ? jawaban : [];
      const kunci = soal.kunci;
      let benar = 0;
      kunci.forEach((k, i) => { if (String(arr[i]) === String(k)) benar++; });
      return benar / kunci.length;
    }
    case 'menjodohkan': {
      const arr = Array.isArray(jawaban) ? jawaban : [];
      const kunci = soal.kunci;
      let benar = 0;
      kunci.forEach((k, i) => { if (String(arr[i]) === String(k)) benar++; });
      return benar / kunci.length;
    }
    default:
      return 0;
  }
}

function resolveStudent(db, user) {
  if (!user || user.role !== 'student') return null;
  return db.students.find(s => s.tenant_id === user.tenant_id && s.email === user.email) || null;
}

function studentLevel(student) {
  if (student.kelas_level && LEVELS.includes(student.kelas_level)) return student.kelas_level;
  return 'X';
}

function progressOf(db, student, babId) {
  return db.progress.find(p => p.student_id === student.id && p.bab_id === babId) || null;
}

function nextLevel(level) {
  const i = LEVELS.indexOf(level);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
}

function kelasUntukTingkat(db, tenantId, level) {
  return db.classes.find(c => c.tenant_id === tenantId && String(c.tingkat || '').toUpperCase() === level)
    || db.classes.find(c => c.tenant_id === tenantId && new RegExp(`^${level}(\\b|-)`, 'i').test(c.nama || ''))
    || null;
}

function babKonten(bab) {
  const tujuan = (bab.tujuan || []).map(t => `<li>${t}</li>`).join('');
  const materi = (bab.materi || []).map((m, i) => `<h3>${i + 1}. ${m.judul}</h3>${m.html}`).join('');
  const glosarium = (bab.glosarium || []).map(g => `<li><strong>${g.istilah}</strong>: ${g.arti}</li>`).join('');
  return `<p>${bab.ringkasan}</p>`
    + `<h3>Tujuan Pembelajaran</h3><ul>${tujuan}</ul>`
    + materi
    + `<h3>Glosarium</h3><ul>${glosarium}</ul>`;
}

function registerKurikulum(app, deps) {
  const { loadDB, saveDB, requireAuth, requireTenant, requireAdmin, cacheDel } = deps;

  app.get('/api/kurikulum', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    const level = student ? studentLevel(student) : (req.query.kelas || 'X');
    const babs = loadLevel(level);

    let prevDone = true;
    const items = babs.map(bab => {
      const prog = student ? progressOf(db, student, bab.id) : null;
      const best = prog ? prog.best_score : null;
      const tuntas = best !== null && best >= KKM;
      const attempts = db.attempts.filter(a => student && a.student_id === student.id && a.bab_id === bab.id).length;
      const unlocked = prevDone;
      prevDone = prevDone && tuntas;
      return {
        id: bab.id,
        urutan: bab.urutan,
        judul: bab.judul,
        ringkasan: bab.ringkasan,
        estimasi: bab.estimasi,
        tujuan: bab.tujuan,
        jumlah_soal: (bab.soal || []).length,
        best_score: best,
        attempts,
        attempts_left: Math.max(0, MAX_ATTEMPTS - attempts),
        tuntas,
        unlocked
      };
    });

    const semuaTuntas = items.length > 0 && items.every(i => i.tuntas);
    res.json({
      level,
      kkm: KKM,
      max_attempts: MAX_ATTEMPTS,
      babs: items,
      tuntas: items.filter(i => i.tuntas).length,
      total: items.length,
      naik_kelas: {
        eligible: semuaTuntas && !!nextLevel(level),
        level_berikut: nextLevel(level),
        alasan: !nextLevel(level)
          ? 'Sudah di jenjang tertinggi'
          : semuaTuntas
            ? 'Semua bab tuntas, siap naik kelas'
            : 'Masih ada bab yang belum tuntas'
      }
    });
  });

  app.get('/api/kurikulum/:babId', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    const level = student ? studentLevel(student) : (req.query.kelas || 'X');
    const babs = loadLevel(level);
    const idx = babs.findIndex(b => b.id === req.params.babId);
    if (idx < 0) return res.status(404).json({ error: 'Bab tidak ditemukan' });

    if (student) {
      const locked = babs.slice(0, idx).some(b => {
        const p = progressOf(db, student, b.id);
        return !p || p.best_score < KKM;
      });
      if (locked) return res.status(403).json({ error: 'Bab masih terkunci' });
    }

    const bab = babs[idx];
    const prog = student ? progressOf(db, student, bab.id) : null;
    const attempts = student ? db.attempts.filter(a => a.student_id === student.id && a.bab_id === bab.id) : [];
    res.json({
      ...publicBab(bab),
      progress: {
        best_score: prog ? prog.best_score : null,
        attempts: attempts.length,
        attempts_left: Math.max(0, MAX_ATTEMPTS - attempts.length),
        riwayat: attempts.map(a => ({ ke: a.ke, score: a.score, benar: a.benar, total: a.total, created_at: a.created_at }))
      }
    });
  });

  app.post('/api/kurikulum/:babId/evaluasi', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    if (!student) return res.status(403).json({ error: 'Hanya siswa yang dapat mengerjakan evaluasi' });

    const level = studentLevel(student);
    const babs = loadLevel(level);
    const idx = babs.findIndex(b => b.id === req.params.babId);
    if (idx < 0) return res.status(404).json({ error: 'Bab tidak ditemukan' });

    const bab = babs[idx];
    const attempts = db.attempts.filter(a => a.student_id === student.id && a.bab_id === bab.id);
    if (attempts.length >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: `Batas ${MAX_ATTEMPTS} percobaan sudah tercapai` });
    }

    const answers = req.body.answers || {};
    const soalList = bab.soal || [];
    let totalPoin = 0;
    const hasil = soalList.map(soal => {
      const poin = gradeSoal(soal, answers[soal.id]);
      totalPoin += poin;
      return {
        soal_id: soal.id,
        tipe: soal.tipe,
        poin: Math.round(poin * 100) / 100,
        kunci: soal.kunci,
        pembahasan: soal.pembahasan
      };
    });

    const score = soalList.length ? Math.round((totalPoin / soalList.length) * 1000) / 10 : 0;
    const ke = attempts.length + 1;

    db.attempts.push({
      id: uuidv4(),
      tenant_id: student.tenant_id,
      student_id: student.id,
      bab_id: bab.id,
      level,
      ke,
      answers,
      score,
      benar: hasil.filter(h => h.poin === 1).length,
      total: soalList.length,
      created_at: new Date().toISOString()
    });

    let prog = progressOf(db, student, bab.id);
    if (!prog) {
      prog = {
        id: uuidv4(),
        tenant_id: student.tenant_id,
        student_id: student.id,
        bab_id: bab.id,
        level,
        best_score: score,
        attempts: ke,
        created_at: new Date().toISOString()
      };
      db.progress.push(prog);
    } else {
      prog.best_score = Math.max(prog.best_score, score);
      prog.attempts = ke;
    }
    prog.updated_at = new Date().toISOString();
    prog.tuntas = prog.best_score >= KKM;

    await saveDB(db);

    res.json({
      score,
      benar: hasil.filter(h => h.poin === 1).length,
      total: soalList.length,
      kkm: KKM,
      tuntas: prog.best_score >= KKM,
      best_score: prog.best_score,
      attempts: ke,
      attempts_left: MAX_ATTEMPTS - ke,
      hasil
    });
  });

  app.post('/api/kurikulum/naik-kelas', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    if (!student) return res.status(403).json({ error: 'Hanya siswa' });

    const level = studentLevel(student);
    const babs = loadLevel(level);
    if (!babs.length) return res.status(400).json({ error: 'Materi jenjang belum tersedia' });

    const belum = babs.filter(b => {
      const p = progressOf(db, student, b.id);
      return !p || p.best_score < KKM;
    });
    if (belum.length) {
      return res.status(400).json({
        error: 'Belum semua bab tuntas',
        belum_tuntas: belum.map(b => ({ id: b.id, judul: b.judul }))
      });
    }

    const naik = nextLevel(level);
    if (!naik) return res.status(400).json({ error: 'Sudah di jenjang tertinggi' });

    student.kelas_level = naik;
    student.naik_kelas_at = new Date().toISOString();
    await saveDB(db);

    res.json({ success: true, level: naik, riwayat: { dari: level, ke: naik, at: student.naik_kelas_at } });
  });

  app.get('/api/admin/kurikulum/progress', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = req.db;
    const students = db.students.filter(s => s.tenant_id === req.tenantId);
    const rows = students.map(s => {
      const level = studentLevel(s);
      const babs = loadLevel(level);
      const items = babs.map(b => {
        const p = progressOf(db, s, b.id);
        return { bab_id: b.id, judul: b.judul, best_score: p ? p.best_score : null, tuntas: !!(p && p.best_score >= KKM) };
      });
      return {
        student_id: s.id,
        nama: s.nama,
        nis: s.nis,
        level,
        tuntas: items.filter(i => i.tuntas).length,
        total: items.length,
        rata_best: items.filter(i => i.best_score !== null).length
          ? Math.round(items.filter(i => i.best_score !== null).reduce((a, i) => a + i.best_score, 0) / items.filter(i => i.best_score !== null).length * 10) / 10
          : null,
        items
      };
    });
    res.json({ kkm: KKM, max_attempts: MAX_ATTEMPTS, students: rows });
  });

  // Menyalin bab kurikulum menjadi materi biasa (bisa diedit/dihapus seperti materi lain).
  app.post('/api/admin/kurikulum/seed-materials', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = req.db;
    const subject = db.subjects.find(s => s.tenant_id === req.tenantId && /geografi/i.test(s.nama || ''))
      || db.subjects.find(s => s.tenant_id === req.tenantId);
    if (!subject) return res.status(400).json({ error: 'Belum ada mapel pada tenant ini' });

    const hasil = { created: 0, updated: 0, tanpa_kelas: [], mapel: subject.nama };
    const now = new Date().toISOString();

    LEVELS.forEach(level => {
      const babs = loadLevel(level);
      if (!babs.length) return;
      const kelas = kelasUntukTingkat(db, req.tenantId, level);
      if (!kelas) {
        hasil.tanpa_kelas.push(level);
        return;
      }
      babs.forEach(bab => {
        const data = {
          tenant_id: req.tenantId,
          subject_id: subject.id,
          class_id: kelas.id,
          judul: `Bab ${bab.urutan}. ${bab.judul}`,
          konten: babKonten(bab),
          modul: `${bab.id.toUpperCase()} · Fase ${bab.fase} · ${bab.estimasi}`,
          youtube_id: '',
          image: '',
          tipe: 'materi',
          sumber: 'kurikulum',
          bab_id: bab.id
        };
        const ada = db.materials.find(m => m.tenant_id === req.tenantId && m.sumber === 'kurikulum' && m.bab_id === bab.id);
        if (ada) {
          Object.assign(ada, data, { updated_at: now });
          hasil.updated++;
        } else {
          db.materials.push({ id: uuidv4(), ...data, created_by: req.user.id, created_at: now, updated_at: now });
          hasil.created++;
        }
      });
    });

    await saveDB(db);
    if (cacheDel) await cacheDel(`dashboard:${req.tenantId}`);
    res.json({ success: true, ...hasil, total: hasil.created + hasil.updated });
  });
}

module.exports = { registerKurikulum };
