// ===== TUGAS MENGAMATI VIDEO =====
// Tugas menonton video YouTube dengan soal interaktif yang muncul pada detik tertentu.
// Video tidak bisa dilewati (dikunci di sisi pemutar) dan jawaban dinilai di server
// memakai kunci jawaban yang tidak pernah dikirim ke browser sebelum siswa menjawab.
const { v4: uuidv4 } = require('uuid');
const { youtubeIdFromInput } = require('./kurikulum');

const KKM = 75;
const MAX_OPTIONS = 5;
const MIN_OPTIONS = 2;

function text(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function gradeVideoAnswers(soalList, answers) {
  const list = Array.isArray(soalList) ? soalList : [];
  const picked = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  let benar = 0;
  const hasil = list.map(soal => {
    const raw = picked[soal.id];
    const dipilih = Number.isInteger(Number(raw)) && raw !== null && raw !== '' ? Number(raw) : null;
    const tepat = dipilih !== null && dipilih === Number(soal.kunci);
    if (tepat) benar++;
    return {
      soal_id: soal.id,
      dipilih,
      kunci: soal.kunci,
      tepat,
      pembahasan: soal.pembahasan || ''
    };
  });
  const total = list.length;
  return {
    benar,
    total,
    score: total ? Math.round((benar / total) * 1000) / 10 : 0,
    hasil
  };
}

// Soal yang belum dijawab sama sekali tidak boleh dikirim sebagai jawaban kosong.
function missingAnswers(soalList, answers) {
  const picked = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  return (Array.isArray(soalList) ? soalList : []).filter(soal => {
    const raw = picked[soal.id];
    return !(Number.isInteger(Number(raw)) && raw !== null && raw !== '' &&
      Number(raw) >= 0 && Number(raw) < (soal.opsi || []).length);
  }).length;
}

function requiredWatchSeconds(task) {
  const soal = Array.isArray(task && task.soal) ? task.soal : [];
  const lastWaktu = soal.reduce((max, item) => Math.max(max, Number(item.waktu) || 0), 0);
  const durasi = Number(task && task.durasi) || 0;
  return Math.max(1, durasi ? durasi - 3 : lastWaktu + 1);
}

// Bangun data tugas dari payload admin. Mengembalikan { error } atau { data }.
function buildTaskData(body = {}) {
  const judul = text(body.judul);
  if (!judul) return { error: 'Judul tugas wajib diisi' };

  const youtubeId = youtubeIdFromInput(body.youtube_id || body.youtube);
  if (!youtubeId) return { error: 'Tautan atau ID video YouTube tidak valid' };

  const durasi = Math.round(clampNumber(body.durasi, 0, 86400));
  const rawSoal = Array.isArray(body.soal) ? body.soal : [];
  if (!rawSoal.length) return { error: 'Minimal satu soal interaktif diperlukan' };
  if (rawSoal.length > 100) return { error: 'Maksimal 100 soal per tugas' };

  const soal = [];
  for (let index = 0; index < rawSoal.length; index++) {
    const item = rawSoal[index] || {};
    const nomor = index + 1;
    const waktu = Math.round(clampNumber(item.waktu, 0, 86400));
    if (durasi && waktu > durasi) {
      return { error: `Waktu soal #${nomor} (${waktu} detik) melebihi durasi video (${durasi} detik)` };
    }
    const pertanyaan = text(item.pertanyaan);
    if (!pertanyaan) return { error: `Pertanyaan soal #${nomor} wajib diisi` };

    const opsi = (Array.isArray(item.opsi) ? item.opsi : []).map(option => text(option));
    if (opsi.length < MIN_OPTIONS || opsi.length > MAX_OPTIONS) {
      return { error: `Soal #${nomor} membutuhkan ${MIN_OPTIONS}–${MAX_OPTIONS} pilihan jawaban` };
    }
    if (opsi.some(option => !option)) return { error: `Soal #${nomor} memiliki pilihan jawaban kosong` };

    const kunci = Number(item.kunci);
    if (!Number.isInteger(kunci) || kunci < 0 || kunci >= opsi.length) {
      return { error: `Kunci jawaban soal #${nomor} belum dipilih dengan benar` };
    }

    soal.push({
      id: text(item.id) || uuidv4(),
      waktu,
      pertanyaan: pertanyaan.slice(0, 2000),
      opsi,
      kunci,
      pembahasan: text(item.pembahasan).slice(0, 2000)
    });
  }

  soal.sort((a, b) => a.waktu - b.waktu);
  const usedIds = new Set();
  soal.forEach(item => {
    if (usedIds.has(item.id)) item.id = uuidv4();
    usedIds.add(item.id);
  });

  return {
    data: {
      judul: judul.slice(0, 200),
      deskripsi: text(body.deskripsi).slice(0, 2000),
      youtube_id: youtubeId,
      durasi,
      class_id: text(body.class_id) || null,
      subject_id: text(body.subject_id) || null,
      aktif: body.aktif !== false,
      soal
    }
  };
}

function publicVideoTask(task, includeKey = false) {
  const soal = (task.soal || []).map(item => {
    if (includeKey) return { ...item };
    const { kunci, pembahasan, ...rest } = item;
    return rest;
  });
  return {
    id: task.id,
    judul: task.judul,
    deskripsi: task.deskripsi || '',
    youtube_id: task.youtube_id,
    durasi: Number(task.durasi) || 0,
    class_id: task.class_id || null,
    subject_id: task.subject_id || null,
    aktif: task.aktif !== false,
    created_at: task.created_at || null,
    updated_at: task.updated_at || null,
    jumlah_soal: soal.length,
    total_skor: soal.length * 10,
    soal
  };
}

function summarizeVideoAttempts(attempts) {
  const list = Array.isArray(attempts) ? attempts.slice() : [];
  if (!list.length) {
    return { attempts: 0, best_score: null, last_score: null, last_at: null, best_attempt: null };
  }
  let best = list[0];
  let last = list[0];
  list.forEach(attempt => {
    if (Number(attempt.score) > Number(best.score)) best = attempt;
    if (new Date(attempt.created_at) >= new Date(last.created_at)) last = attempt;
  });
  return {
    attempts: list.length,
    best_score: Number(best.score) || 0,
    best_attempt: Number(best.ke) || null,
    last_score: Number(last.score) || 0,
    last_at: last.created_at || null
  };
}

function nextAttemptNumber(attempts) {
  return (Array.isArray(attempts) ? attempts : [])
    .reduce((max, attempt) => Math.max(max, Number(attempt.ke) || 0), 0) + 1;
}

function registerVideoTask(app, deps) {
  const { saveDB, requireAuth, requireTenant, requireAdmin, requireStaff, notifyStudent } = deps;

  function studentOf(db, user) {
    if (!user || user.role !== 'student') return null;
    return db.students.find(s =>
      s.tenant_id === user.tenant_id &&
      (s.user_id === user.id || s.id === user.student_id || (user.email && s.email === user.email))
    ) || null;
  }

  function tasksOf(db, tenantId) {
    return (db.video_tasks || []).filter(task => task.tenant_id === tenantId);
  }

  function visibleToStudent(task, student) {
    return task.aktif !== false && (!task.class_id || task.class_id === student.class_id);
  }

  function attemptsOf(db, taskId, studentId) {
    return (db.video_attempts || []).filter(attempt =>
      attempt.task_id === taskId && (!studentId || attempt.student_id === studentId)
    );
  }

  function classInfo(db, classId) {
    const item = db.classes.find(c => c.id === classId);
    return item ? item.nama : 'Semua kelas';
  }

  app.get('/api/video-tasks', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = studentOf(db, req.user);
    const tasks = tasksOf(db, req.tenantId)
      .filter(task => (student ? visibleToStudent(task, student) : true));

    const items = tasks
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(task => {
        const attempts = student ? attemptsOf(db, task.id, student.id) : attemptsOf(db, task.id, null);
        const summary = summarizeVideoAttempts(attempts);
        return {
          ...publicVideoTask(task),
          kelas_nama: classInfo(db, task.class_id),
          progress: {
            ...summary,
            kkm: KKM,
            tuntas: summary.best_score !== null && summary.best_score >= KKM
          }
        };
      });

    res.json(items);
  });

  app.get('/api/video-tasks/:id', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const task = tasksOf(db, req.tenantId).find(item => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Tugas video tidak ditemukan' });

    const student = studentOf(db, req.user);
    if (student) {
      if (!visibleToStudent(task, student)) {
        return res.status(403).json({ error: 'Tugas video ini tidak tersedia untuk kelas Anda' });
      }
      const attempts = attemptsOf(db, task.id, student.id);
      const summary = summarizeVideoAttempts(attempts);
      return res.json({
        ...publicVideoTask(task),
        kelas_nama: classInfo(db, task.class_id),
        required_watch_seconds: requiredWatchSeconds(task),
        progress: {
          ...summary,
          kkm: KKM,
          tuntas: summary.best_score !== null && summary.best_score >= KKM
        }
      });
    }

    res.json({
      ...publicVideoTask(task, true),
      kelas_nama: classInfo(db, task.class_id),
      required_watch_seconds: requiredWatchSeconds(task)
    });
  });

  app.post('/api/video-tasks/:id/attempt', requireAuth, requireTenant, async (req, res) => {
    const db = req.db;
    const student = studentOf(db, req.user);
    if (!student) return res.status(403).json({ error: 'Hanya siswa yang dapat mengirim jawaban tugas video' });

    const task = tasksOf(db, req.tenantId).find(item => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Tugas video tidak ditemukan' });
    if (!visibleToStudent(task, student)) {
      return res.status(403).json({ error: 'Tugas video ini tidak tersedia untuk kelas Anda' });
    }

    const soalList = Array.isArray(task.soal) ? task.soal : [];
    if (!soalList.length) return res.status(400).json({ error: 'Tugas video belum memiliki soal' });

    const answers = req.body && req.body.answers;
    const belumDijawab = missingAnswers(soalList, answers);
    if (belumDijawab > 0) {
      return res.status(400).json({ error: `${belumDijawab} soal belum dijawab. Video harus ditonton sampai selesai.` });
    }

    const required = requiredWatchSeconds(task);
    const watched = Math.max(0, Number(req.body && req.body.watched_seconds) || 0);
    const position = Math.max(0, Number(req.body && req.body.position) || 0);
    const minimal = Math.floor(required * 0.97);
    if (watched < minimal || position < minimal) {
      return res.status(400).json({
        error: `Video belum ditonton sampai selesai (${Math.round(Math.min(watched, position))} dari ${required} detik). Video tidak boleh dilewati.`,
        required_watch_seconds: required,
        watched_seconds: Math.round(watched)
      });
    }

    const graded = gradeVideoAnswers(soalList, answers);
    const previous = attemptsOf(db, task.id, student.id);
    const attempt = {      id: uuidv4(),
      tenant_id: student.tenant_id,
      task_id: task.id,
      student_id: student.id,
      class_id: student.class_id || null,
      ke: nextAttemptNumber(previous),
      answers: answers && typeof answers === 'object' ? answers : {},
      score: graded.score,
      benar: graded.benar,
      total: graded.total,
      watched_seconds: Math.round(watched),
      position: Math.round(position),
      created_at: new Date().toISOString()
    };
    if (!Array.isArray(db.video_attempts)) db.video_attempts = [];
    db.video_attempts.push(attempt);
    await saveDB(db);

    const summary = summarizeVideoAttempts([...previous, attempt]);

    if (typeof notifyStudent === 'function') {
      notifyStudent(
        student.tenant_id,
        student.id,
        [
          'Geo Edulabs - Tugas mengamati video selesai',
          `Tugas: ${task.judul}`,
          `Nilai percobaan ke-${attempt.ke}: ${graded.score}`,
          `Nilai terbaik: ${summary.best_score} (${summary.best_score >= KKM ? 'Tuntas' : 'Belum tuntas'})`
        ].join('\n')
      ).catch(() => {});
    }

    res.json({
      attempt_id: attempt.id,
      ke: attempt.ke,
      score: graded.score,
      benar: graded.benar,
      total: graded.total,
      kkm: KKM,
      best_score: summary.best_score,
      tuntas: summary.best_score >= KKM,
      hasil: graded.hasil
    });
  });

  // ===== ADMIN =====
  app.get('/api/admin/video-tasks', requireAuth, requireStaff, requireTenant, async (req, res) => {
    const db = req.db;
    const items = tasksOf(db, req.tenantId)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(task => {
        const attempts = attemptsOf(db, task.id, null);
        const students = new Set(attempts.map(attempt => attempt.student_id));
        const scores = attempts.map(attempt => Number(attempt.score) || 0);
        return {
          ...publicVideoTask(task, true),
          kelas_nama: classInfo(db, task.class_id),
          hasil: {
            attempts: attempts.length,
            students: students.size,
            average_score: scores.length
              ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
              : null
          }
        };
      });
    res.json(items);
  });

  app.get('/api/admin/video-tasks/:id/hasil', requireAuth, requireStaff, requireTenant, async (req, res) => {
    const db = req.db;
    const task = tasksOf(db, req.tenantId).find(item => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Tugas video tidak ditemukan' });

    const attempts = attemptsOf(db, task.id, null)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(attempt => {
        const student = db.students.find(s => s.id === attempt.student_id);
        return {
          ...attempt,
          student_nama: student ? student.nama : '-',
          student_nis: student ? (student.nis || '') : ''
        };
      });

    res.json({ task: publicVideoTask(task, true), attempts });
  });

  app.post('/api/admin/video-tasks', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = req.db;
    const built = buildTaskData(req.body);
    if (built.error) return res.status(400).json({ error: built.error });

    const now = new Date().toISOString();
    const task = {
      id: uuidv4(),
      tenant_id: req.tenantId,
      ...built.data,
      created_by: req.user.id,
      created_at: now,
      updated_at: now
    };
    db.video_tasks.push(task);
    if (!Array.isArray(db.video_attempts)) db.video_attempts = [];
    await saveDB(db);
    res.json(publicVideoTask(task, true));
  });

  app.put('/api/admin/video-tasks/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = req.db;
    const task = tasksOf(db, req.tenantId).find(item => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Tugas video tidak ditemukan' });

    const built = buildTaskData(req.body);
    if (built.error) return res.status(400).json({ error: built.error });

    Object.assign(task, built.data, { updated_at: new Date().toISOString() });
    await saveDB(db);
    res.json(publicVideoTask(task, true));
  });

  app.delete('/api/admin/video-tasks/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = req.db;
    const index = db.video_tasks.findIndex(item => item.id === req.params.id && item.tenant_id === req.tenantId);
    if (index < 0) return res.status(404).json({ error: 'Tugas video tidak ditemukan' });

    db.video_tasks.splice(index, 1);
    db.video_attempts = (db.video_attempts || []).filter(attempt =>
      !(attempt.task_id === req.params.id && attempt.tenant_id === req.tenantId)
    );
    await saveDB(db);
    res.json({ success: true });
  });
}

module.exports = {
  registerVideoTask,
  buildTaskData,
  gradeVideoAnswers,
  missingAnswers,
  publicVideoTask,
  requiredWatchSeconds,
  summarizeVideoAttempts,
  nextAttemptNumber,
  KKM
};
