// ===== PEMBELAJARAN BERJENJANG (KURIKULUM GEOGRAFI) =====
// Modul terpisah agar server.js tetap ringkas. Dipasang lewat registerKurikulum().
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const KKM = 75;
const LEVELS = ['X', 'XI', 'XII'];
const QUESTION_TYPES = ['pgm', 'pg_singkat', 'pg_kompleks', 'menjodohkan', 'benar_salah'];
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

function getBabTitle(babId, level) {
  if (!LEVELS.includes(String(level || '').toUpperCase())) return null;
  const bab = loadLevel(String(level).toUpperCase()).find(item => item.id === babId);
  return bab ? bab.judul : null;
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
    case 'pgm':
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

function validQuestion(soal) {
  if (!soal || !QUESTION_TYPES.includes(soal.tipe) || !String(soal.pertanyaan || '').trim()) return false;
  const key = Array.isArray(soal.kunci) ? soal.kunci : [];
  const text = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z0-9#]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  if (text(soal.stimulus && soal.stimulus.isi).length < 800 || text(soal.pembahasan).length < 80) return false;
  const validIndices = (values, size) => values.length > 0
    && values.every(value => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) < size);

  if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm') {
    return Array.isArray(soal.opsi) && soal.opsi.length === 5 && key.length === 1
      && validIndices(key, soal.opsi.length);
  }
  if (soal.tipe === 'pg_kompleks') {
    return Array.isArray(soal.opsi) && soal.opsi.length === 5 && key.length >= 2
      && validIndices(key, soal.opsi.length);
  }
  if (soal.tipe === 'benar_salah') {
    return Array.isArray(soal.pernyataan) && soal.pernyataan.length >= 2
      && key.length === soal.pernyataan.length && key.every(value => value === 'B' || value === 'S');
  }
  return Array.isArray(soal.kiri) && soal.kiri.length >= 2
    && Array.isArray(soal.kanan) && soal.kanan.length >= 2
    && key.length === soal.kiri.length && validIndices(key, soal.kanan.length);
}

function resolveStudent(db, user) {
  if (!user || user.role !== 'student') return null;
  return db.students.find(s =>
    s.tenant_id === user.tenant_id &&
    (s.user_id === user.id || s.id === user.student_id || (user.email && s.email === user.email))
  ) || null;
}

function studentLevel(db, student) {
  if (student.kelas_level && LEVELS.includes(student.kelas_level)) return student.kelas_level;
  const classItem = db && db.classes ? db.classes.find(c => c.id === student.class_id) : null;
  const tingkat = classItem ? String(classItem.tingkat || '').toUpperCase() : '';
  return LEVELS.includes(tingkat) ? tingkat : 'X';
}

function progressOf(db, student, babId) {
  return db.progress.find(p => p.student_id === student.id && p.bab_id === babId) || null;
}

function summarizeAttempts(attempts) {
  if (!attempts.length) {
    return { attempts: 0, highest_score: null, highest_attempt: null, penalty_count: 0, best_score: null };
  }

  const ordered = attempts.slice().sort((a, b) => Number(a.ke) - Number(b.ke));
  let highestScore = -1;
  let highestAttempt = null;
  let penaltyCount = 0;
  ordered.forEach(attempt => {
    const score = Number(attempt.score) || 0;
    if (highestAttempt !== null && score < highestScore) penaltyCount++;
    if (score > highestScore) {
      highestScore = score;
      highestAttempt = Number(attempt.ke);
    }
  });

  return {
    attempts: ordered.length,
    highest_score: highestScore,
    highest_attempt: highestAttempt,
    penalty_count: penaltyCount,
    best_score: Math.max(0, Math.round((highestScore - penaltyCount) * 10) / 10)
  };
}

function sanitizeDraftAnswers(soalList, answers) {
  const clean = {};
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return clean;

  soalList.forEach(soal => {
    const answer = answers[soal.id];
    if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm') {
      if (Number.isInteger(answer) && answer >= 0 && answer < (soal.opsi || []).length) clean[soal.id] = answer;
    } else if (soal.tipe === 'pg_kompleks') {
      const valid = Array.isArray(answer)
        ? [...new Set(answer.filter(value => Number.isInteger(value) && value >= 0 && value < (soal.opsi || []).length))]
        : [];
      if (valid.length) clean[soal.id] = valid;
    } else if (soal.tipe === 'benar_salah') {
      if (Array.isArray(answer)) {
        const valid = Array.from({ length: (soal.pernyataan || []).length }, (_, index) =>
          answer[index] === 'B' || answer[index] === 'S' ? answer[index] : null
        );
        if (valid.some(value => value !== null)) clean[soal.id] = valid;
      }
    } else if (soal.tipe === 'menjodohkan' && Array.isArray(answer)) {
      const valid = Array.from({ length: (soal.kiri || []).length }, (_, index) =>
        Number.isInteger(answer[index]) && answer[index] >= 0 && answer[index] < (soal.kanan || []).length ? answer[index] : null
      );
      if (valid.some(value => value !== null)) clean[soal.id] = valid;
    }
  });
  return clean;
}

function countAnsweredQuestions(soalList, answers) {
  return soalList.filter(soal => {
    const answer = answers && answers[soal.id];
    if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm') return Number.isInteger(answer);
    if (soal.tipe === 'pg_kompleks') return Array.isArray(answer) && answer.length > 0;
    if (soal.tipe === 'benar_salah') {
      return Array.isArray(answer) && answer.length >= (soal.pernyataan || []).length
        && Array.from({ length: (soal.pernyataan || []).length }, (_, index) => answer[index]).every(value => value === 'B' || value === 'S');
    }
    if (soal.tipe === 'menjodohkan') {
      return Array.isArray(answer) && answer.length >= (soal.kiri || []).length
        && Array.from({ length: (soal.kiri || []).length }, (_, index) => answer[index]).every(Number.isInteger);
    }
    return false;
  }).length;
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
  const { loadDB, saveDB, requireAuth, requireTenant, requireAdmin, cacheDel, notifyStudent } = deps;

  app.get('/api/kurikulum', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    const level = student ? studentLevel(db, student) : (req.query.kelas || 'X');
    const babs = loadLevel(level);

    const tenant = db.tenants.find(t => t.id === req.tenantId);
    const semesterAktif = tenant && tenant.semester_aktif ? Number(tenant.semester_aktif) : 1;

    // Track progression per semester
    const prevDoneBySemester = { 1: true, 2: true };

    const items = babs.map(bab => {
      const babSem = Number(bab.semester) || (bab.urutan <= 4 ? 1 : 2);
      const prog = student ? progressOf(db, student, bab.id) : null;
      const attempts = db.attempts.filter(a => student && a.student_id === student.id && a.bab_id === bab.id);
      const summary = summarizeAttempts(attempts);
      const best = attempts.length ? summary.best_score : (prog ? prog.best_score : null);
      const tuntas = best !== null && best >= KKM;
      const materiaCount = (bab.materi || []).length;
      const topicProgress = prog && prog.topic_progress || {};
      const readingPercent = materiaCount
        ? Math.round(Object.values(topicProgress).reduce((sum, value) => sum + Math.max(0, Math.min(100, Number(value) || 0)), 0) / materiaCount)
        : 0;
      const answeredCount = prog ? Number(prog.last_answered_count) || 0 : 0;
      const assessmentPercent = (bab.soal || []).length
        ? Math.round((answeredCount / bab.soal.length) * 100)
        : 0;
      const completionPercent = tuntas ? 100 : Math.round((readingPercent + assessmentPercent) / 2);

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
        highest_score: attempts.length ? summary.highest_score : null,
        highest_attempt: attempts.length ? summary.highest_attempt : null,
        penalty_count: attempts.length ? summary.penalty_count : 0,
        attempts: attempts.length,
        reading_percent: readingPercent,
        assessment_percent: assessmentPercent,
        completion_percent: completionPercent,
        read_topics: Object.values(topicProgress).filter(value => Number(value) >= 100).length,
        total_topics: materiaCount,
        answered_questions: answeredCount,
        total_questions: (bab.soal || []).length,
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

  app.put('/api/kurikulum/:babId/progress', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    if (!student) return res.status(403).json({ error: 'Hanya siswa yang dapat menyimpan progres materi' });

    const level = studentLevel(db, student);
    const babs = loadLevel(level);
    const babIndex = babs.findIndex(bab => bab.id === req.params.babId);
    if (babIndex < 0) return res.status(404).json({ error: 'Bab tidak ditemukan' });

    const bab = babs[babIndex];
    const semester = Number(bab.semester) || (bab.urutan <= 4 ? 1 : 2);
    const tenant = db.tenants.find(item => item.id === req.tenantId);
    const activeSemester = tenant && tenant.semester_aktif ? Number(tenant.semester_aktif) : 1;
    if (semester !== activeSemester) return res.status(403).json({ error: 'Semester materi belum aktif' });

    const previousBab = babs.filter(item => {
      const itemSemester = Number(item.semester) || (item.urutan <= 4 ? 1 : 2);
      return itemSemester === semester && item.urutan < bab.urutan;
    });
    const locked = previousBab.some(item => {
      const attempts = db.attempts.filter(a => a.student_id === student.id && a.bab_id === item.id);
      const progress = progressOf(db, student, item.id);
      const score = attempts.length ? summarizeAttempts(attempts).best_score : (progress && progress.best_score);
      return score === null || score === undefined || score < KKM;
    });
    if (locked) return res.status(403).json({ error: 'Bab masih terkunci, selesaikan evaluasi bab sebelumnya' });

    const body = req.body || {};
    const topicProgress = {};
    const current = progressOf(db, student, bab.id);
    const previousProgress = current && current.topic_progress || {};
    if (body.topic_progress !== undefined
      && (!body.topic_progress || typeof body.topic_progress !== 'object' || Array.isArray(body.topic_progress))) {
      return res.status(400).json({ error: 'Format progres baca tidak valid' });
    }
    if (body.answers !== undefined
      && (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers))) {
      return res.status(400).json({ error: 'Format jawaban evaluasi tidak valid' });
    }
    if (body.topic_progress && typeof body.topic_progress === 'object' && !Array.isArray(body.topic_progress)) {
      Object.entries(body.topic_progress).forEach(([key, value]) => {
        const index = Number(key);
        const percent = Number(value);
        if (Number.isInteger(index) && index >= 0 && index < (bab.materi || []).length
          && Number.isFinite(percent) && percent >= 0 && percent <= 100) {
          topicProgress[index] = Math.max(Number(previousProgress[index]) || 0, percent);
        }
      });
    }

    const draftAnswers = sanitizeDraftAnswers(bab.soal || [], body.answers);
    let progress = current;
    if (!progress) {
      progress = {
        id: uuidv4(),
        tenant_id: student.tenant_id,
        student_id: student.id,
        bab_id: bab.id,
        level,
        best_score: null,
        attempts: 0,
        created_at: new Date().toISOString()
      };
      db.progress.push(progress);
    }
    progress.topic_progress = { ...previousProgress, ...topicProgress };
    progress.draft_answers = draftAnswers;
    progress.last_answered_count = countAnsweredQuestions(bab.soal || [], draftAnswers);
    progress.updated_at = new Date().toISOString();
    await saveDB(db);

    const topicCount = (bab.materi || []).length;
    const readingPercent = topicCount
      ? Math.round(Object.values(progress.topic_progress).reduce((sum, value) => sum + Math.max(0, Math.min(100, Number(value) || 0)), 0) / topicCount)
      : 0;
    const assessmentPercent = (bab.soal || []).length
      ? Math.round((progress.last_answered_count / bab.soal.length) * 100)
      : 0;
    res.json({
      reading_percent: readingPercent,
      assessment_percent: assessmentPercent,
      completion_percent: Math.round((readingPercent + assessmentPercent) / 2),
      read_topics: Object.values(progress.topic_progress).filter(value => Number(value) >= 100).length,
      total_topics: topicCount,
      answered_questions: progress.last_answered_count,
      total_questions: (bab.soal || []).length
    });
  });

  app.get('/api/kurikulum/peringkat', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    if (!student || !student.class_id) {
      return res.status(403).json({ error: 'Peringkat hanya tersedia untuk siswa yang terdaftar di kelas' });
    }

    const tenant = db.tenants.find(item => item.id === req.tenantId);
    const semesterAktif = tenant && tenant.semester_aktif ? Number(tenant.semester_aktif) : 1;
    const level = studentLevel(db, student);
    const babs = loadLevel(level).filter(bab => {
      const semester = Number(bab.semester) || (bab.urutan <= 4 ? 1 : 2);
      return semester === semesterAktif;
    });
    const babIds = new Set(babs.map(bab => bab.id));
    const classmates = db.students.filter(item =>
      item.tenant_id === req.tenantId && item.class_id === student.class_id
    );
    const classmateIds = new Set(classmates.map(item => item.id));
    const attemptsByMaterial = new Map();
    db.attempts.filter(attempt =>
      attempt.tenant_id === req.tenantId
      && classmateIds.has(attempt.student_id)
      && babIds.has(attempt.bab_id)
      && attempt.level === level
    ).forEach(attempt => {
      const key = `${attempt.student_id}:${attempt.bab_id}`;
      if (!attemptsByMaterial.has(key)) attemptsByMaterial.set(key, []);
      attemptsByMaterial.get(key).push(attempt);
    });

    const ranked = classmates.map(classmate => {
      const scores = [];
      babs.forEach(bab => {
        const key = `${classmate.id}:${bab.id}`;
        const attempts = attemptsByMaterial.get(key) || [];
        const progress = progressOf(db, classmate, bab.id);
        const score = attempts.length
          ? summarizeAttempts(attempts).best_score
          : (progress && progress.best_score !== null && progress.best_score !== undefined
            ? Number(progress.best_score)
            : null);
        if (Number.isFinite(score)) scores.push(score);
      });
      if (!scores.length) return null;

      const photo = classmate.foto_url || classmate.photo_url || classmate.avatar_url || classmate.foto || classmate.photo || '';
      return {
        student_id: classmate.id,
        nama: classmate.nama || 'Siswa',
        foto: typeof photo === 'string' ? photo : '',
        nilai: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10) / 10,
        materi_dinilai: scores.length
      };
    }).filter(Boolean).sort((a, b) =>
      b.nilai - a.nilai
      || b.materi_dinilai - a.materi_dinilai
      || a.nama.localeCompare(b.nama, 'id')
    );

    const classItem = db.classes.find(item => item.id === student.class_id && item.tenant_id === req.tenantId);
    res.json({
      kelas: classItem ? classItem.nama : student.class_id,
      semester_aktif: semesterAktif,
      total_siswa: classmates.length,
      peringkat: ranked.slice(0, 3).map((item, index) => ({ ...item, peringkat: index + 1 }))
    });
  });

  app.get('/api/kurikulum/:babId', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    const level = student ? studentLevel(db, student) : (req.query.kelas || 'X');
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
        const attempts = db.attempts.filter(a => a.student_id === student.id && a.bab_id === b.id);
        const best = attempts.length ? summarizeAttempts(attempts).best_score : (p && p.best_score);
        return best === null || best === undefined || best < KKM;
      });
      if (locked) return res.status(403).json({ error: 'Bab masih terkunci, selesaikan evaluasi bab sebelumnya' });
    }

    const prog = student ? progressOf(db, student, bab.id) : null;
    const attempts = student ? db.attempts.filter(a => a.student_id === student.id && a.bab_id === bab.id) : [];
    const summary = summarizeAttempts(attempts);
    const bestScore = attempts.length ? summary.best_score : (prog ? prog.best_score : null);
    const topicProgress = prog && prog.topic_progress || {};
    const topicCount = (bab.materi || []).length;
    const answeredCount = prog
      ? Number(prog.last_answered_count) || 0
      : 0;
    const readingPercent = topicCount
      ? Math.round(Object.values(topicProgress).reduce((sum, value) => sum + Math.max(0, Math.min(100, Number(value) || 0)), 0) / topicCount)
      : 0;
    const assessmentPercent = (bab.soal || []).length
      ? Math.round((answeredCount / bab.soal.length) * 100)
      : 0;
    res.json({
      ...publicBab(bab),
      semester: babSem,
      kkm: KKM,
      is_active_semester: babSem === semesterAktif,
      progress: {
        best_score: bestScore,
        highest_score: attempts.length ? summary.highest_score : null,
        highest_attempt: attempts.length ? summary.highest_attempt : null,
        penalty_count: attempts.length ? summary.penalty_count : 0,
        attempts: attempts.length,
        topic_progress: topicProgress,
        reading_percent: readingPercent,
        assessment_percent: assessmentPercent,
        completion_percent: bestScore !== null && bestScore >= KKM ? 100 : Math.round((readingPercent + assessmentPercent) / 2),
        read_topics: Object.values(topicProgress).filter(value => Number(value) >= 100).length,
        total_topics: topicCount,
        answered_questions: answeredCount,
        total_questions: (bab.soal || []).length,
        draft_answers: student && prog ? (prog.draft_answers || {}) : {},
        attempts_left: null,
        riwayat: attempts.map(a => ({ ke: a.ke, score: a.score, benar: a.benar, total: a.total, created_at: a.created_at }))
      }
    });
  });

  app.post('/api/kurikulum/:babId/evaluasi', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    if (!student) return res.status(403).json({ error: 'Hanya siswa yang dapat mengerjakan evaluasi' });

    const level = studentLevel(db, student);
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
    // Nomor percobaan dihitung dari nomor tertinggi yang sudah ada (bukan jumlah baris),
    // supaya pengulangan tidak pernah menimpa/menyamai nomor percobaan sebelumnya.
    const ke = attempts.reduce((max, a) => Math.max(max, Number(a.ke) || 0), 0) + 1;

    const newAttempt = {
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
    };
    db.attempts.push(newAttempt);
    const summary = summarizeAttempts([...attempts, newAttempt]);
    // Kunci dan pembahasan hanya dibuka jika nilai akhir materi mencapai KKM.
    if (summary.best_score < KKM) {
      hasil.forEach(h => { delete h.kunci; delete h.pembahasan; });
    }

    let prog = progressOf(db, student, bab.id);
    if (!prog) {
      prog = {
        id: uuidv4(),
        tenant_id: student.tenant_id,
        student_id: student.id,
        bab_id: bab.id,
        level,
        best_score: summary.best_score,
        attempts: ke,
        created_at: new Date().toISOString()
      };
      db.progress.push(prog);
    } else {
      prog.best_score = summary.best_score;
      prog.attempts = ke;
    }
    prog.highest_score = summary.highest_score;
    prog.highest_attempt = summary.highest_attempt;
    prog.penalty_count = summary.penalty_count;
    prog.last_answered_count = countAnsweredQuestions(soalList, answers);
    prog.draft_answers = {};
    prog.updated_at = new Date().toISOString();
    prog.tuntas = summary.best_score >= KKM;

    await saveDB(db);

    // Notifikasi WhatsApp ke siswa (bila nomornya tersimpan dan WhatsApp tenant terhubung).
    if (typeof notifyStudent === 'function') {
      notifyStudent(
        student.tenant_id,
        student.id,
        [
          'Geo Edulabs - Evaluasi selesai',
          `Materi: ${bab.judul || bab.id}`,
          `Nilai percobaan ke-${ke}: ${score}`,
          `Nilai akhir: ${summary.best_score} (${summary.best_score >= KKM ? 'Tuntas' : 'Belum tuntas'})`,
          summary.best_score >= KKM ? 'Materi berikutnya sudah terbuka di LMS.' : 'Silakan ulangi evaluasi untuk mencapai KKM.'
        ].join('\n')
      ).catch(() => {});
    }

    res.json({
      score,
      benar: hasil.filter(h => h.poin === 1).length,
      total: soalList.length,
      kkm: KKM,
      tuntas: summary.best_score >= KKM,
      best_score: summary.best_score,
      highest_score: summary.highest_score,
      highest_attempt: summary.highest_attempt,
      penalty_count: summary.penalty_count,
      attempts: ke,
      attempts_left: null,
      hasil
    });
  });

  app.post('/api/kurikulum/naik-kelas', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = resolveStudent(db, req.user);
    if (!student) return res.status(403).json({ error: 'Hanya siswa' });

    const level = studentLevel(db, student);
    const babs = loadLevel(level);
    if (!babs.length) return res.status(400).json({ error: 'Materi jenjang belum tersedia' });

    const belum = babs.filter(b => {
      const p = progressOf(db, student, b.id);
      const attempts = db.attempts.filter(a => a.student_id === student.id && a.bab_id === b.id);
      const best = attempts.length ? summarizeAttempts(attempts).best_score : (p && p.best_score);
      return best === null || best === undefined || best < KKM;
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
      const level = studentLevel(db, s);
      const babs = loadLevel(level);
      const attemptCount = {};
      db.attempts.forEach(a => {
        if (a.student_id === s.id) attemptCount[a.bab_id] = (attemptCount[a.bab_id] || 0) + 1;
      });
      const items = babs.map(b => {
        const p = progressOf(db, s, b.id);
        const attempts = db.attempts.filter(a => a.student_id === s.id && a.bab_id === b.id);
        const summary = summarizeAttempts(attempts);
        const best = attempts.length ? summary.best_score : (p ? p.best_score : null);
        return {
          bab_id: b.id,
          judul: b.judul,
          best_score: best,
          highest_score: attempts.length ? summary.highest_score : null,
          highest_attempt: attempts.length ? summary.highest_attempt : null,
          penalty_count: attempts.length ? summary.penalty_count : 0,
          attempts: attemptCount[b.id] || 0,
          tuntas: best !== null && best >= KKM
        };
      });
      return {
        student_id: s.id,
        nama: s.nama,
        nis: s.nis,
        level,
        kelas_id: s.class_id || '',
        kelas_nama: (db.classes.find(c => c.id === s.class_id) || {}).nama || '-',
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
      if (body.soal.length < 5 || body.soal.length > 10) {
        return res.status(400).json({ error: 'Setiap materi harus memiliki 5–10 soal evaluasi' });
      }
      if (QUESTION_TYPES.some(type => !body.soal.some(soal => soal && soal.tipe === type))) {
        return res.status(400).json({ error: 'Setiap materi harus memiliki soal untuk kelima tipe yang tersedia' });
      }
      if (body.soal.some(soal => !validQuestion(soal))) {
        return res.status(400).json({ error: 'Periksa tipe, kunci, bacaan minimal 800 karakter, dan pembahasan minimal 80 karakter pada setiap soal' });
      }
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

module.exports = { registerKurikulum, getBabTitle, summarizeAttempts };
