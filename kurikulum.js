// ===== PEMBELAJARAN BERJENJANG (KURIKULUM GEOGRAFI) =====
// Modul terpisah agar server.js tetap ringkas. Dipasang lewat registerKurikulum().
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const KKM = 75;
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
  return db.students.find(s =>
    s.tenant_id === user.tenant_id &&
    (s.user_id === user.id || s.id === user.student_id || (user.email && s.email === user.email))
  ) || null;
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
  const materi = (bab.materi || []).map((m, i) => {
    const fig = m.gambar
      ? `<figure><img src="${m.gambar}" alt="${m.caption || m.judul || ''}"><figcaption>${m.caption || ''}</figcaption></figure>`
      : '';
    return `<h3>${i + 1}. ${m.judul}</h3>${fig}${m.html}`;
  }).join('');
  const glosarium = (bab.glosarium || []).map(g => `<li><strong>${g.istilah}</strong>: ${g.arti}</li>`).join('');
  return `<p>${bab.ringkasan}</p>`
    + `<h3>Tujuan Pembelajaran</h3><ul>${tujuan}</ul>`
    + materi
    + `<h3>Glosarium</h3><ul>${glosarium}</ul>`;
}

function findBab(babId) {
  for (const level of LEVELS) {
    const bab = loadLevel(level).find(b => b.id === babId);
    if (bab) return { level, bab };
  }
  return null;
}

function saveBab(level, babId, patch) {
  const dir = path.join(CONTENT_DIR, `kelas-${level.toLowerCase()}`);
  if (!fs.existsSync(dir)) return false;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const full = path.join(dir, file);
    const arr = JSON.parse(fs.readFileSync(full, 'utf-8'));
    const idx = arr.findIndex(b => b.id === babId);
    if (idx === -1) continue;
    const fixed = { id: arr[idx].id, kelas: arr[idx].kelas, urutan: arr[idx].urutan, fase: arr[idx].fase };
    arr[idx] = { ...arr[idx], ...patch, ...fixed };
    fs.writeFileSync(full, JSON.stringify(arr, null, 2) + '\n', 'utf-8');
    contentCache.delete(level);
    return true;
  }
  return false;
}

function registerKurikulum(app, deps) {
  const { loadDB, saveDB, requireAuth, requireTenant, requireAdmin, cacheDel } = deps;

  app.get('/api/kurikulum', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    const level = student ? studentLevel(student) : (req.query.kelas || 'X');
    const babs = loadLevel(level);

    const tenant = db.tenants.find(t => t.id === req.tenantId);
    const semesterAktif = tenant && tenant.semester_aktif ? Number(tenant.semester_aktif) : 1;

    // Track progression per semester
    const prevDoneBySemester = { 1: true, 2: true };

    const items = babs.map(bab => {
      const babSem = Number(bab.semester) || (bab.urutan <= 4 ? 1 : 2);
      const prog = student ? progressOf(db, student, bab.id) : null;
      const best = prog ? prog.best_score : null;
      const tuntas = best !== null && best >= KKM;
      const attempts = db.attempts.filter(a => student && a.student_id === student.id && a.bab_id === bab.id).length;

      let unlocked = false;
      let lock_reason = null;

      if (babSem !== semesterAktif) {
        unlocked = false;
        lock_reason = 'semester_inactive';
      } else {
        unlocked = prevDoneBySemester[babSem];
        prevDoneBySemester[babSem] = prevDoneBySemester[babSem] && tuntas;
        if (!unlocked) lock_reason = 'evaluasi_sebelumnya';
      }

      return {
        id: bab.id,
        urutan: bab.urutan,
        semester: babSem,
        is_active_semester: babSem === semesterAktif,
        lock_reason,
        judul: bab.judul,
        ringkasan: bab.ringkasan,
        estimasi: bab.estimasi,
        tujuan: bab.tujuan,
        youtube_id: bab.youtube_id || '',
        jumlah_soal: (bab.soal || []).length,
        best_score: best,
        attempts,
        attempts_left: null,
        tuntas,
        unlocked
      };
    });

    // Kriteria naik kelas dihitung dari seluruh bab atau bab semester aktif
    const activeBabs = items.filter(i => i.is_active_semester);
    const semuaTuntas = items.length > 0 && items.every(i => i.tuntas);
    res.json({
      level,
      semester_aktif: semesterAktif,
      kkm: KKM,
      babs: items,
      tuntas: items.filter(i => i.tuntas).length,
      total: items.length,
      active_tuntas: activeBabs.filter(i => i.tuntas).length,
      active_total: activeBabs.length,
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

    const bab = babs[idx];
    const babSem = Number(bab.semester) || (bab.urutan <= 4 ? 1 : 2);
    const tenant = db.tenants.find(t => t.id === req.tenantId);
    const semesterAktif = tenant && tenant.semester_aktif ? Number(tenant.semester_aktif) : 1;

    if (student) {
      if (babSem !== semesterAktif) {
        return res.status(403).json({ error: `Bab ini berada pada Semester ${babSem} yang belum aktif (Sekolah aktif di Semester ${semesterAktif})` });
      }

      // Periksa apakah bab-bab sebelumnya pada semester yang sama sudah tuntas
      const prevBabsInSem = babs.filter(b => {
        const s = Number(b.semester) || (b.urutan <= 4 ? 1 : 2);
        return s === babSem && b.urutan < bab.urutan;
      });

      const locked = prevBabsInSem.some(b => {
        const p = progressOf(db, student, b.id);
        return !p || p.best_score < KKM;
      });
      if (locked) return res.status(403).json({ error: 'Bab masih terkunci, selesaikan evaluasi bab sebelumnya' });
    }

    const prog = student ? progressOf(db, student, bab.id) : null;
    const attempts = student ? db.attempts.filter(a => a.student_id === student.id && a.bab_id === bab.id) : [];
    res.json({
      ...publicBab(bab),
      semester: babSem,
      is_active_semester: babSem === semesterAktif,
      progress: {
        best_score: prog ? prog.best_score : null,
        attempts: attempts.length,
        attempts_left: null,
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
      attempts_left: null,
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
      const attemptCount = {};
      db.attempts.forEach(a => {
        if (a.student_id === s.id) attemptCount[a.bab_id] = (attemptCount[a.bab_id] || 0) + 1;
      });
      const items = babs.map(b => {
        const p = progressOf(db, s, b.id);
        return { bab_id: b.id, judul: b.judul, best_score: p ? p.best_score : null, attempts: attemptCount[b.id] || 0, tuntas: !!(p && p.best_score >= KKM) };
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
        total_attempts: items.reduce((a, i) => a + i.attempts, 0),
        items
      };
    });
    res.json({ kkm: KKM, students: rows });
  });

  // --- Admin: baca & sunting isi kurikulum (materi + soal) ---
  app.get('/api/admin/kurikulum/:babId', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const found = findBab(req.params.babId);
    if (!found) return res.status(404).json({ error: 'Bab tidak ditemukan' });
    res.json({ ...found.bab, level: found.level });
  });

  app.put('/api/admin/kurikulum/:babId', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const found = findBab(req.params.babId);
    if (!found) return res.status(404).json({ error: 'Bab tidak ditemukan' });

    const body = req.body || {};
    const patch = {};
    if (typeof body.judul === 'string') patch.judul = body.judul.trim();
    if (typeof body.ringkasan === 'string') patch.ringkasan = body.ringkasan.trim();
    if (typeof body.cp === 'string') patch.cp = body.cp.trim();
    if (typeof body.estimasi === 'string') patch.estimasi = body.estimasi.trim();
    if (Array.isArray(body.tujuan)) patch.tujuan = body.tujuan.map(t => String(t).trim()).filter(Boolean);
    if (Array.isArray(body.materi)) {
      patch.materi = body.materi.map(m => ({
        judul: String(m.judul || '').trim(),
        html: String(m.html || ''),
        gambar: String(m.gambar || '').trim(),
        caption: String(m.caption || '').trim()
      }));
    }
    if (Array.isArray(body.glosarium)) {
      patch.glosarium = body.glosarium
        .map(g => ({ istilah: String(g.istilah || '').trim(), arti: String(g.arti || '').trim() }))
        .filter(g => g.istilah && g.arti);
    }
    if (Array.isArray(body.soal)) {
      patch.soal = body.soal.map((s, i) => ({
        ...s,
        id: s.id || `${found.bab.id}-q${i + 1}`,
        stimulus: s.stimulus ? {
          jenis: s.stimulus.jenis || 'teks',
          judul: String(s.stimulus.judul || '').trim(),
          isi: String(s.stimulus.isi || ''),
          gambar: String(s.stimulus.gambar || '').trim(),
          sumber: String(s.stimulus.sumber || 'ilustrasi sintetis').trim()
        } : null
      }));
    }

    if (!saveBab(found.level, found.bab.id, patch)) {
      return res.status(500).json({ error: 'Gagal menyimpan bab' });
    }
    res.json({ success: true, bab: findBab(found.bab.id)?.bab || null });
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
        const babSem = Number(bab.semester) || (bab.urutan <= 4 ? 1 : 2);
        const ytId = bab.youtube_id || (bab.materi && bab.materi.find(m => m.youtube_id)?.youtube_id) || '';
        const data = {
          tenant_id: req.tenantId,
          subject_id: subject.id,
          class_id: kelas.id,
          semester: babSem,
          judul: `Bab ${bab.urutan}. ${bab.judul}`,
          konten: babKonten(bab),
          modul: `${bab.id.toUpperCase()} · Fase ${bab.fase} · Sem ${babSem} · ${bab.estimasi}`,
          youtube_id: ytId,
          image: bab.image || '',
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
