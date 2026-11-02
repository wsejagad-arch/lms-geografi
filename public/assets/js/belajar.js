// ===== PEMBELAJARAN BERJENJANG (SISWA) =====
// Alur: daftar materi per kelas (gembok per bab) -> baca bagian -> evaluasi -> bab berikutnya terbuka.
const TIPE_LABEL = {
  pgm: 'Pilihan Ganda Majemuk',
  pg_singkat: 'Pilihan Ganda',
  pg_kompleks: 'Pilihan Ganda Kompleks',
  menjodohkan: 'Menjodohkan',
  benar_salah: 'Benar–Salah'
};

const BL_LOCK = '<svg class="bl-lock" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const BL_UNLOCK = '<svg class="bl-lock" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0"/></svg>';

let blState = { kurikulum: null, bab: null, answers: {}, topicProgress: {}, lastResult: null, activeTopicIndex: 0 };
let blProgressTimer = null;
let blReadingTimer = null;
let blReadingTicker = null;
let blReadingListener = null;
let blProgressRequest = Promise.resolve();

async function blApi(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Gagal memuat data');
  return data;
}

function blEsc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Waktu baca realistis =====
// Kecepatan baca dipakai untuk menahan penyimpanan jawaban sebelum siswa benar-benar membaca.
const BL_READ_WORDS_PER_SECOND = 4.2;      // ±250 kata/menit untuk materi
const BL_ANSWER_WORDS_PER_SECOND = 3.2;    // ±190 kata/menit untuk soal (baca + analisis)
const BL_GATE_MIN_SECONDS = 60;
const BL_GATE_MAX_SECONDS = 900;

function blPlainText(html) {
  return String(html === undefined || html === null ? '' : html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function blWordCount(html) {
  const text = blPlainText(html);
  return text ? text.split(' ').length : 0;
}

function blReadingMinSeconds(html) {
  return Math.min(150, Math.max(6, Math.round(blWordCount(html) / BL_READ_WORDS_PER_SECOND)));
}

function blSoalReadSeconds(soal) {
  const s = soal || {};
  const teks = [
    s.pertanyaan,
    (s.opsi || []).join(' '),
    (s.pernyataan || []).join(' '),
    (s.kiri || []).join(' '),
    (s.kanan || []).join(' ')
  ].join(' ');
  const base = { pg_singkat: 8, pgm: 8, pg_kompleks: 14, menjodohkan: 16, benar_salah: 14 }[s.tipe] || 10;
  const level = String(s.level || '').toUpperCase();
  const bonus = /^C[56]$/.test(level) ? 10 : /^C4$/.test(level) ? 7 : /^C3$/.test(level) ? 4 : 0;
  return Math.min(90, Math.max(10, Math.round(base + blWordCount(teks) / BL_ANSWER_WORDS_PER_SECOND + bonus)));
}

function blExamGateSeconds(soalList, options) {
  const list = soalList || [];
  if (!list.length) return 0;
  // Stimulus umumnya dipakai bersama semua soal pada satu bab, jadi dihitung sekali.
  const stimulusSeconds = Math.round(blWordCount(list[0].stimulus && list[0].stimulus.isi) / BL_READ_WORDS_PER_SECOND);
  const total = stimulusSeconds + list.reduce(function (sum, s) { return sum + blSoalReadSeconds(s); }, 0);
  const normal = Math.min(BL_GATE_MAX_SECONDS, Math.max(BL_GATE_MIN_SECONDS, Math.round(total)));
  // Pengulangan: siswa sudah membaca materi, jadi gerbangnya lebih pendek (tetap tidak instan).
  if (options && options.retake) return Math.max(30, Math.round(normal * 0.35));
  return normal;
}

function blExamElapsedSeconds() {
  if (!blState.examStartedAt) return 0;
  let elapsed = (Date.now() - blState.examStartedAt) / 1000;
  if (blState.examHiddenAt) elapsed -= (Date.now() - blState.examHiddenAt) / 1000;
  return Math.max(0, elapsed - (blState.examPausedSeconds || 0));
}

function blFormatDuration(totalSeconds) {
  const secs = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function blExamGateRemaining() {
  if (!blState.examGateSeconds) return 0;
  return Math.max(0, Math.ceil(blState.examGateSeconds - blExamElapsedSeconds()));
}

function blRenderExamTimer() {
  const el = document.getElementById('bl-timer');
  if (!el || !el.classList) return;
  const remaining = blExamGateRemaining();
  const gate = blState.examGateSeconds || 0;
  if (!gate) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.classList.toggle('ready', remaining <= 0);
  el.textContent = remaining > 0
    ? (blState.examRetake
      ? 'Pengulangan: tunggu ' + blFormatDuration(remaining) + ' sebelum jawaban dapat disimpan'
      : 'Waktu baca realistis: ' + blFormatDuration(remaining) + ' lagi sebelum jawaban dapat disimpan')
    : 'Waktu baca terpenuhi — jawaban bisa disimpan dan dikirim';
  const btn = document.getElementById('bl-submit');
  if (btn && !blState.examSubmitting) {
    btn.textContent = remaining > 0 ? 'Kirim Jawaban (tunggu ' + blFormatDuration(remaining) + ')' : 'Kirim Jawaban';
  }
  if (remaining <= 0 && blState.examPendingSave) {
    blState.examPendingSave = false;
    blQueueProgressSave();
  }
}

function blStopExamTimer() {
  if (blState.examTimer && typeof clearInterval === 'function') {
    clearInterval(blState.examTimer);
  }
  blState.examTimer = null;
  blState.examStartedAt = 0;
  blState.examGateSeconds = 0;
  blState.examHiddenAt = 0;
  blState.examPausedSeconds = 0;
  blState.examPendingSave = false;
  blHideShield();
}

function blStartExamTimer(soalList) {
  if (blState.examTimer && typeof clearInterval === 'function') clearInterval(blState.examTimer);
  blState.examTimer = null;
  blState.examStartedAt = Date.now();
  blState.examPausedSeconds = 0;
  blState.examHiddenAt = document.hidden ? Date.now() : 0;
  const riwayat = (blState.bab && blState.bab.progress && blState.bab.progress.attempts) || 0;
  blState.examRetake = riwayat > 0;
  blState.examGateSeconds = blExamGateSeconds(soalList, { retake: blState.examRetake });
  blRenderExamTimer();
  if (typeof setInterval === 'function') {
    blState.examTimer = setInterval(blRenderExamTimer, 1000);
    if (blState.examTimer && typeof blState.examTimer.unref === 'function') blState.examTimer.unref();
  }
}

// ===== Pengaman ujian: tanpa blok-kopi, klik kanan, atau tangkapan layar =====
let blGuardBound = false;
let blShieldTimer = null;

function blExamVisible() {
  if (!blState.bab || typeof document.querySelector !== 'function') return false;
  return !!document.querySelector('#bl-eval .bl-q');
}

function blHideShield() {
  if (blShieldTimer) {
    clearTimeout(blShieldTimer);
    blShieldTimer = null;
  }
  const el = document.getElementById('bl-shield');
  if (el) el.remove();
  document.body.classList.remove('bl-exam-blur');
}

function blShowShield(message) {
  if (!blExamVisible()) return;
  let el = document.getElementById('bl-shield');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bl-shield';
    el.className = 'bl-shield';
    el.innerHTML = [
      '<div class="bl-shield-box" role="alertdialog" aria-modal="true">',
      '  <div class="bl-shield-ic">🔒</div>',
      '  <h4>Area ujian dilindungi</h4>',
      '  <p class="bl-shield-msg"></p>',
      '  <button type="button" class="bl-btn primary" id="bl-shield-ok">Lanjutkan Mengerjakan</button>',
      '</div>'
    ].join('');
    document.body.appendChild(el);
    el.querySelector('#bl-shield-ok').addEventListener('click', blHideShield);
  }
  el.querySelector('.bl-shield-msg').textContent = message;
  el.classList.add('on');
  document.body.classList.add('bl-exam-blur');
  if (blShieldTimer) clearTimeout(blShieldTimer);
  blShieldTimer = setTimeout(blHideShield, 6000);
}

function blGuardMessage(kind) {
  const map = {
    contextmenu: 'Klik kanan dinonaktifkan saat mengerjakan soal.',
    copy: 'Menyalin soal tidak diizinkan. Kerjakan dengan kemampuan sendiri.',
    cut: 'Menyalin soal tidak diizinkan. Kerjakan dengan kemampuan sendiri.',
    paste: 'Menempel jawaban dari luar tidak diizinkan.',
    drag: 'Menyeret teks soal tidak diizinkan.',
    print: 'Mencetak atau menyimpan halaman soal tidak diizinkan.',
    devtools: 'Alat pengembang browser terdeteksi. Tutup untuk melanjutkan.',
    screenshot: 'Upaya tangkapan layar terdeteksi. Soal disembunyikan sementara.',
    blur: 'Fokus halaman berpindah. Soal disembunyikan sampai kembali ke ujian.'
  };
  return map[kind] || 'Aktivitas ini tidak diizinkan selama ujian.';
}

function blSetupExamGuard() {
  if (blGuardBound) return;
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  blGuardBound = true;

  const block = function (kind) {
    return function (event) {
      if (!blExamVisible()) return;
      const inExam = event.target && event.target.closest && event.target.closest('#bl-eval');
      if (!inExam) return;
      event.preventDefault();
      event.stopPropagation();
      blShowShield(blGuardMessage(kind));
    };
  };

  ['contextmenu', 'copy', 'cut', 'paste', 'dragstart', 'selectstart'].forEach(function (type) {
    document.addEventListener(type, block(type === 'contextmenu' ? 'contextmenu' : type === 'dragstart' ? 'drag' : type), true);
  });

  document.addEventListener('keydown', function (event) {
    if (!blExamVisible()) return;
    const key = String(event.key || '').toLowerCase();
    const combo = event.ctrlKey || event.metaKey;
    if (key === 'f12' || (combo && event.shiftKey && ['i', 'j', 'c', 'k'].indexOf(key) >= 0)) {
      event.preventDefault();
      blShowShield(blGuardMessage('devtools'));
      return;
    }
    if (combo && ['c', 'x', 'v', 'a', 's', 'p', 'u'].indexOf(key) >= 0) {
      event.preventDefault();
      blShowShield(blGuardMessage(['c', 'x', 'a'].indexOf(key) >= 0 ? 'copy' : key === 'v' ? 'paste' : 'print'));
    }
  }, true);

  ['keyup', 'keydown'].forEach(function (type) {
    document.addEventListener(type, function (event) {
      if (!blExamVisible()) return;
      if (event.key === 'PrintScreen' || event.code === 'PrintScreen' || event.keyCode === 44) {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(function () {});
        }
        blShowShield(blGuardMessage('screenshot'));
      }
    }, true);
  });

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('blur', function () {
      if (!blExamVisible()) return;
      blShowShield(blGuardMessage('blur'));
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (blState.examStartedAt && !blState.examHiddenAt) blState.examHiddenAt = Date.now();
      if (blExamVisible()) blShowShield(blGuardMessage('screenshot'));
      return;
    }
    if (blState.examHiddenAt) {
      blState.examPausedSeconds = (blState.examPausedSeconds || 0) + (Date.now() - blState.examHiddenAt) / 1000;
      blState.examHiddenAt = 0;
      blRenderExamTimer();
    }
  });
}

function blCountAnswered(answers, questions) {
  return (questions || []).filter(function (soal) {
    const answer = answers && answers[soal.id];
    if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm') return Number.isInteger(answer);
    if (soal.tipe === 'pg_kompleks') return Array.isArray(answer) && answer.length > 0;
    if (soal.tipe === 'benar_salah') {
      return Array.isArray(answer) && answer.length >= (soal.pernyataan || []).length
        && Array.from({ length: (soal.pernyataan || []).length }, function (_, index) { return answer[index]; })
          .every(function (value) { return value === 'B' || value === 'S'; });
    }
    if (soal.tipe === 'menjodohkan') {
      return Array.isArray(answer) && answer.length >= (soal.kiri || []).length
        && Array.from({ length: (soal.kiri || []).length }, function (_, index) { return answer[index]; })
          .every(Number.isInteger);
    }
    return false;
  }).length;
}

function blUpdateProgressDisplay() {
  const b = blState.bab;
  if (!b) return;
  const p = b.progress || {};
  const topics = (b.materi || []).length;
  const readCount = Object.values(blState.topicProgress).filter(function (value) { return Number(value) >= 100; }).length;
  const readPercent = topics
    ? Math.round(Object.values(blState.topicProgress).reduce(function (sum, value) { return sum + Math.max(0, Math.min(100, Number(value) || 0)); }, 0) / topics)
    : 0;
  const answered = blCountAnswered(blState.answers, b.soal);
  const questions = (b.soal || []).length;
  const assessmentPercent = questions ? Math.round(answered / questions * 100) : 0;
  const completionPercent = p.best_score !== null && p.best_score >= b.kkm
    ? 100
    : Math.round((readPercent + assessmentPercent) / 2);

  const values = {
    'bl-reading-label': readCount + '/' + topics + ' bagian · ' + readPercent + '%',
    'bl-reading-bar': readPercent + '%',
    'bl-assessment-label': answered + '/' + questions + ' soal · ' + assessmentPercent + '%',
    'bl-assessment-bar': assessmentPercent + '%',
    'bl-completion-label': completionPercent + '%',
    'bl-completion-bar': completionPercent + '%',
    'bl-assessment-live': answered + ' dari ' + questions + ' soal terjawab'
  };
  Object.keys(values).forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (id.endsWith('-bar')) {
      if (el.style) el.style.width = values[id];
    }
    else el.textContent = values[id];
  });
  p.reading_percent = readPercent;
  p.assessment_percent = assessmentPercent;
  p.completion_percent = completionPercent;
  p.read_topics = readCount;
  p.answered_questions = answered;
}

function blShowProgressSaveError(error) {
  const status = document.getElementById('bl-progress-status');
  if (status) {
    status.textContent = 'Progres belum tersimpan: ' + (error.message || 'gagal menyimpan');
    status.classList.add('error');
  }
}

function blQueueProgressSave() {
  if (blProgressTimer) clearTimeout(blProgressTimer);
  blProgressTimer = setTimeout(function () {
    blProgressTimer = null;
    blSaveProgress().catch(blShowProgressSaveError);
  }, 450);
}

function blSaveProgress() {
  if (!blState.bab) return Promise.resolve(null);
  const b = blState.bab;
  b.progress = b.progress || {};
  const gateRemaining = blExamGateRemaining();
  if (gateRemaining > 0) {
    blState.examPendingSave = true;
    const status = document.getElementById('bl-progress-status');
    if (status) {
      status.textContent = 'Menunggu waktu baca realistis (' + blFormatDuration(gateRemaining) + ') sebelum progres disimpan.';
      status.classList.remove('error');
    }
    return Promise.resolve(null);
  }
  const payload = {
    topic_progress: Object.assign({}, blState.topicProgress),
    answers: JSON.parse(JSON.stringify(blState.answers || {}))
  };
  const request = blProgressRequest.catch(function () {}).then(function () {
    const status = document.getElementById('bl-progress-status');
    if (status) {
      status.textContent = 'Menyimpan progres…';
      status.classList.remove('error');
    }
    return blApi('/api/kurikulum/' + encodeURIComponent(b.id) + '/progress', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }).then(function (progress) {
    Object.assign(b.progress, progress);
    blUpdateProgressDisplay();
    const status = document.getElementById('bl-progress-status');
    if (status) {
      status.textContent = 'Progres tersimpan';
      status.classList.remove('error');
    }
    return progress;
  });
  blProgressRequest = request;
  return request;
}

function blTrackTopicProgress() {
  const card = document.getElementById('bl-active-topic');
  const b = blState.bab;
  if (!card || !b || !b.materi || !b.materi.length) return;
  const index = blState.activeTopicIndex;
  const rect = card.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  if ((document.hidden || visibleHeight < Math.min(rect.height, viewportHeight) * 0.45)
    || (typeof card.getClientRects === 'function' && card.getClientRects().length === 0)) return;
  const elapsed = Date.now() - (blState.topicStartedAt || Date.now());
  const materiAktif = (b.materi || [])[index] || {};
  const minReadMs = blReadingMinSeconds(materiAktif.html || '') * 1000;
  const timeFactor = Math.min(1, elapsed / minReadMs);
  let percent = 0;
  if (rect.height <= viewportHeight * 0.75) {
    percent = timeFactor >= 1 ? 100 : Math.round(timeFactor * 90);
  } else {
    const sectionTop = rect.top + window.scrollY;
    const scrollRange = Math.max(1, rect.height - viewportHeight * 0.65);
    const readPosition = window.scrollY + viewportHeight * 0.35 - sectionTop;
    percent = Math.max(0, Math.min(100, Math.round(readPosition / scrollRange * 100)));
    percent = Math.round(percent * timeFactor);
    if (timeFactor < 1) percent = Math.min(percent, 99);
    if (rect.bottom <= viewportHeight + 20 && timeFactor >= 1) percent = 100;
  }
  const previous = Number(blState.topicProgress[index]) || 0;
  if (percent > previous) {
    blState.topicProgress[index] = percent;
    blUpdateProgressDisplay();
    blQueueProgressSave();
  }
}

function blReadingTick() {
  if (!document.getElementById('bl-active-topic')) {
    if (blReadingTicker) {
      clearInterval(blReadingTicker);
      blReadingTicker = null;
    }
    return;
  }
  blTrackTopicProgress();
}

function blFig(m) {
  if (!m || !m.gambar) return '';
  return '<figure class="bl-figure"><img src="' + blEsc(m.gambar) + '" alt="' + blEsc(m.caption || m.judul || '') + '" loading="lazy">' +
    (m.caption ? '<figcaption>' + blEsc(m.caption) + '</figcaption>' : '') + '</figure>';
}
async function blLoadKurikulum() {
  const host = document.getElementById('belajar-root');
  if (!host) return;
  host.innerHTML = '<p class="bl-loading">Memuat materi…</p>';
  try {
    blState.kurikulum = await blApi('/api/kurikulum');
    blState.bab = null;
    blRenderList();
  } catch (err) {
    host.innerHTML = '<p class="bl-error">' + blEsc(err.message) + '</p>';
  }
}

function blRenderList() {
  const k = blState.kurikulum;
  const host = document.getElementById('belajar-root');
  const pct = k.total
    ? Math.round(k.babs.reduce(function (sum, bab) { return sum + (Number(bab.completion_percent) || 0); }, 0) / k.total)
    : 0;
  const naik = k.naik_kelas;
  const berikutnya = k.babs.find(function (b) { return b.unlocked && !b.tuntas; });
  const previewId = k.babs.find(function (b) { return b.lock_reason === 'evaluasi_sebelumnya'; })?.id;

  host.innerHTML = [
    '<div class="bl-wrap">',
    '  <div class="bl-top">',
    '    <div class="bl-level">' + blEsc(k.level) + '</div>',
    '    <div style="flex:1;min-width:180px">',
    '      <h2>Kelas ' + blEsc(k.level) + ' — Geografi</h2>',
    '      <p>' + k.tuntas + ' dari ' + k.total + ' materi selesai · aktivitas ' + pct + '% · KKM ' + k.kkm + '</p>',
    '    </div>',
    '    <div class="bl-bar"><span style="width:' + pct + '%"></span></div>',
    '    <div class="bl-pct">' + pct + '%</div>',
    '  </div>',
    blSemesterJourney(k),
    berikutnya
      ? '  <p class="bl-hint">Lanjutkan: <b>' + blEsc(berikutnya.judul) + '</b>. Materi lain terbuka setelah evaluasi materi sebelumnya tuntas.</p>'
      : '  <p class="bl-hint">Semua materi terbuka. Selesaikan evaluasi untuk menuntaskan bab.</p>',
    '  <div class="bl-list">',
    k.babs.map(function (b) { return blBabCard(b, b.id === previewId); }).join(''),
    '  </div>',
    '  <div class="bl-actions">',
    '    <button class="bl-btn primary" id="bl-naik" ' + (naik.eligible ? '' : 'disabled') + '>Naik ke Kelas ' + blEsc(naik.level_berikut || '-') + '</button>',
    '    <button class="bl-btn" id="bl-refresh">Muat ulang</button>',
    '  </div>',
    '  <p class="bl-note">' + blEsc(naik.alasan) + '</p>',
    '</div>'
  ].join('');

  host.querySelectorAll('.bl-bab').forEach(function (el) {
    el.addEventListener('click', function () {
      if (el.dataset.locked === 'true') {
        const msg = el.dataset.reason || 'Selesaikan evaluasi materi sebelumnya terlebih dahulu.';
        el.classList.add('shake');
        setTimeout(function () { el.classList.remove('shake'); }, 400);
        alert(msg);
        return;
      }
      blOpenBab(el.dataset.id);
    });
  });
  document.getElementById('bl-refresh').addEventListener('click', blLoadKurikulum);
  document.getElementById('bl-naik').addEventListener('click', blNaikKelas);
}

function blSemesterJourney(kurikulum, averageScore) {
  const babs = kurikulum.babs.filter(function (bab) { return bab.is_active_semester; });
  if (!babs.length) return '';
  const selesai = babs.filter(function (bab) { return bab.tuntas; }).length;
  const steps = babs.map(function (bab, index) {
    const done = bab.tuntas;
    const available = !done && bab.unlocked;
    const status = done ? 'done' : available ? 'available' : 'pending';
    const label = done ? 'Selesai' : available ? 'Terbuka, belum selesai' : 'Terkunci';
    return [
      '<li class="bl-journey-step ' + status + '">',
      '  <span class="bl-journey-icon" role="img" aria-label="' + label + '">' +
        (done
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
          : available ? BL_UNLOCK : BL_LOCK) + '</span>',
      '  <span class="bl-journey-name">Materi ' + (index + 1) + '</span>',
      '  <span class="bl-journey-title">' + blEsc(bab.judul) + '</span>',
      '</li>'
    ].join('');
  }).join('');

  return [
    '<section class="bl-journey' + (averageScore === undefined ? '' : ' bl-journey-dashboard') + '" aria-label="Perjalanan materi semester ' + blEsc(kurikulum.semester_aktif) + '">',
    '  <div class="bl-journey-head"><div><h3>Perjalanan Materi Semester ' + blEsc(kurikulum.semester_aktif) + '</h3>',
    '  <p>Selesaikan evaluasi setiap materi secara bertahap.</p></div>',
    '  <div class="bl-journey-stats"><strong>' + selesai + ' dari ' + babs.length + ' selesai</strong>' +
    (averageScore === undefined
      ? ''
      : '<strong class="bl-journey-average">Rata-rata nilai ' + (averageScore === null ? '—' : blEsc(averageScore)) + '</strong>') +
    '</div></div>',
    '  <ol class="bl-journey-steps">' + steps + '</ol>',
    '</section>'
  ].join('');
}

function blBabCard(b, isNextPreview = false) {
  const locked = !b.unlocked;
  const cls = ['bl-bab'];
  if (b.tuntas) cls.push('done');
  if (locked) cls.push('locked');
  if (locked && isNextPreview) cls.push('bl-bab-preview');

  const chip = b.tuntas
    ? '<span class="bl-chip ok">Selesai · ' + b.best_score + '</span>'
    : (b.best_score !== null ? '<span class="bl-chip warn">Belum selesai · terbaik ' + b.best_score + '</span>' : '<span class="bl-chip">Belum dimulai</span>');
  const status = locked
    ? '<span class="bl-chip lock">' + BL_LOCK + ' Terkunci</span>'
    : (b.tuntas ? '' : '<span class="bl-chip open">Terbuka</span>');
  const reason = locked ? 'Materi ini terkunci. Selesaikan evaluasi materi sebelumnya (nilai ≥ ' + (blState.kurikulum.kkm) + ') untuk membukanya.' : '';
  const previewTag = locked && isNextPreview
    ? '<span class="bl-preview-tag">' + BL_LOCK + ' Materi berikutnya</span>'
    : '';

  return [
    '<article class="' + cls.join(' ') + '" data-id="' + blEsc(b.id) + '" data-locked="' + locked + '" data-reason="' + blEsc(reason) + '" ' + (locked ? 'aria-disabled="true"' : 'tabindex="0" role="button"') + '>',
    '  <div class="bl-num">' + b.urutan + '</div>',
    '  <div class="bl-bab-body">',
    '    <h3>' + blEsc(b.judul) + ' ' + previewTag + '</h3>',
    '    <p>' + blEsc(b.ringkasan) + '</p>',
    '    <div class="bl-meta">' + chip + status +
    '<span class="bl-chip">' + b.jumlah_soal + ' soal</span>' +
    '<span class="bl-chip">' + blEsc(b.estimasi || '-') + '</span>' +
    '<span class="bl-chip">' + (b.attempts || 0) + '× dikerjakan</span></div>',
    '    <div class="bl-bab-progress">',
    '      <div class="bl-progress-line"><span>Progres aktivitas</span><strong>' + (Number(b.completion_percent) || 0) + '%</strong></div>',
    '      <div class="bl-progress-track" role="progressbar" aria-label="Progres aktivitas materi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (Number(b.completion_percent) || 0) + '"><span style="width:' + (Number(b.completion_percent) || 0) + '%"></span></div>',
    '      <div class="bl-progress-detail"><span>Baca ' + (Number(b.read_topics) || 0) + '/' + (Number(b.total_topics) || 0) + ' bagian · ' + (Number(b.reading_percent) || 0) + '%</span><span>Evaluasi ' + (Number(b.answered_questions) || 0) + '/' + (Number(b.total_questions) || 0) + ' soal · ' + (Number(b.assessment_percent) || 0) + '%</span></div>',
    '    </div>',
    '  </div>',
    '</article>'
  ].join('');
}

function blShortTopicTitle(title) {
  if (!title) return 'Bagian';
  let short = String(title).trim();
  if (short.length > 30) short = short.substring(0, 28) + '…';
  return short;
}

async function blOpenBab(id) {
  const host = document.getElementById('belajar-root');
  host.innerHTML = '<p class="bl-loading">Memuat materi…</p>';
  try {
    blState.bab = await blApi('/api/kurikulum/' + encodeURIComponent(id));
    blState.answers = Object.assign({}, blState.bab.progress.draft_answers || {});
    blState.topicProgress = Object.assign({}, blState.bab.progress.topic_progress || {});
    blState.lastResult = null;
    blState.activeTopicIndex = 0;
    blRenderBab();
  } catch (err) {
    host.innerHTML = '<p class="bl-error">' + blEsc(err.message) + '</p>';
  }
}

function blBindSteps(goTopic) {
  document.querySelectorAll('.bl-alur-step').forEach(function (btn) {
    if (btn.disabled) return;
    btn.addEventListener('click', function () { goTopic(Number(btn.dataset.tidx)); });
  });
}

function blRenderBab() {
  const b = blState.bab;
  const p = b.progress;
  const host = document.getElementById('belajar-root');
  const materiList = b.materi || [];
  const cur = materiList[blState.activeTopicIndex] || materiList[0] || { judul: '', html: '' };
  const sudahEvaluasi = (p.attempts || 0) > 0;

  const tuntas = p.best_score !== null && p.best_score >= b.kkm;
  const steps = materiList.map(function (m, idx) {
    const read = Number(blState.topicProgress[idx]) >= 100;
    return '<button class="bl-alur-step ' + (idx === blState.activeTopicIndex ? 'active' : '') + (read ? ' read' : '') + '" data-tidx="' + idx + '">' +
      '<span>' + (read ? '✓' : idx + 1) + '</span> ' + blEsc(blShortTopicTitle(m.judul)) + '</button>';
  }).join('');

  const navHtml = '';

  const prevBtn = blState.activeTopicIndex > 0
    ? '<button class="bl-btn" id="bl-btn-prev-topic">← Sebelumnya</button>' : '<div></div>';
  const nextBtn = blState.activeTopicIndex < materiList.length - 1
    ? '<button class="bl-btn primary" id="bl-btn-next-topic">Bagian berikutnya →</button>'
    : '<button class="bl-btn primary" id="bl-btn-finish-topic">Lanjut ke Evaluasi ↓</button>';

  const topicHtml = [
    '<div class="bl-card bl-topic-card" id="bl-active-topic">',
    '  <h3>' + blEsc(cur.judul) + '</h3>',
    blFig(cur),
    '  <div class="bl-prose">' + (typeof lmsSanitize === 'function' ? lmsSanitize(cur.html || '') : '') + '</div>',
    sudahEvaluasi ? '' : '  <div class="bl-topic-nav-footer">' + prevBtn + nextBtn + '</div>',
    sudahEvaluasi ? '' : '  <div class="bl-topic-pos">Bagian ' + (blState.activeTopicIndex + 1) + ' dari ' + materiList.length + '</div>',
    '</div>'
  ].join('');

  host.innerHTML = [
    '<div class="bl-wrap">',
    '  <div class="bl-detail-head">',
    '    <h2>' + b.urutan + '. ' + blEsc(b.judul) + '</h2>',
    '    <p>' + blEsc(b.cp || '') + '</p>',
    '  </div>',
    '  <div class="bl-card">',
    '    <h3>Tujuan Pembelajaran</h3>',
    '    <ul class="bl-goal">' + (b.tujuan || []).map(function (t) { return '<li>' + blEsc(t) + '</li>'; }).join('') + '</ul>',
    '  </div>',
    '  <div class="bl-card bl-progress-card">',
    '    <div class="bl-progress-head"><h3>Progres materi</h3><span id="bl-completion-label">0%</span></div>',
    '    <div class="bl-progress-track" role="progressbar" aria-label="Progres aktivitas materi" aria-valuemin="0" aria-valuemax="100"><span id="bl-completion-bar"></span></div>',
    '    <div class="bl-progress-grid">',
    '      <div><div class="bl-progress-line"><span>Materi dibaca</span><strong id="bl-reading-label">0/' + materiList.length + ' bagian · 0%</strong></div><div class="bl-progress-track"><span id="bl-reading-bar"></span></div></div>',
    '      <div><div class="bl-progress-line"><span>Evaluasi dikerjakan</span><strong id="bl-assessment-label">0/' + (b.soal || []).length + ' soal · 0%</strong></div><div class="bl-progress-track"><span id="bl-assessment-bar"></span></div></div>',
    '    </div>',
    '    <p class="bl-progress-status" id="bl-progress-status" aria-live="polite">Progres tersimpan otomatis</p>',
    '  </div>',
    navHtml,
    '<div id="bl-topic-container">' + topicHtml + '</div>',
    p.riwayat && p.riwayat.length ? '<div class="bl-card"><h3>Riwayat Percobaan</h3><div class="bl-glos">' + p.riwayat.map(function (r) { return '<div>Percobaan ' + r.ke + ': <b>' + r.score + '</b> (' + r.benar + '/' + r.total + ' benar)</div>'; }).join('') + '</div></div>' : '',
    '  <div id="bl-eval"></div>',
    materiList.length > 1
      ? '<div class="bl-card" id="bl-topic-nav"><h3>Lanjutan Materi</h3>' +
        '<div class="bl-alur-steps" id="bl-steps-bottom">' + steps + '</div>' +
        (tuntas ? '' : '<p class="bl-note" id="bl-steps-hint" style="margin:8px 0 0">Semua bagian materi bisa dibaca. Materi berikutnya terbuka setelah evaluasi bab ini tuntas (nilai ≥ ' + b.kkm + ').</p>') +
        '</div>'
      : '',
    '</div>'
  ].join('');
  blStartEval();
  blUpdateProgressDisplay();
  if (blReadingListener && typeof window.removeEventListener === 'function') window.removeEventListener('scroll', blReadingListener);
  if (blReadingTimer) clearTimeout(blReadingTimer);
  blState.topicStartedAt = Date.now();
  if (typeof window.addEventListener === 'function') {
    blReadingListener = blTrackTopicProgress;
    window.addEventListener('scroll', blReadingListener, { passive: true });
    blTrackTopicProgress();
    blReadingTimer = setTimeout(blTrackTopicProgress, 3600);
    if (blReadingTicker) clearInterval(blReadingTicker);
    blReadingTicker = setInterval(blReadingTick, 2000);
  }

  const goTopic = function (idx) {
    blState.activeTopicIndex = idx;
    blRenderBab();
    const navEl = document.getElementById('bl-active-topic');
    if (navEl) navEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  blBindSteps(goTopic);

  const prevEl = document.getElementById('bl-btn-prev-topic');
  if (prevEl) prevEl.addEventListener('click', function () { goTopic(Math.max(0, blState.activeTopicIndex - 1)); });

  const nextEl = document.getElementById('bl-btn-next-topic');
  if (nextEl) nextEl.addEventListener('click', function () { goTopic(Math.min(materiList.length - 1, blState.activeTopicIndex + 1)); });

  const finEl = document.getElementById('bl-btn-finish-topic');
  if (finEl) finEl.addEventListener('click', function () {
    document.getElementById('bl-eval').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function blStartEval() {
  const b = blState.bab;
  const host = document.getElementById('bl-eval');
  host.innerHTML = [
    '<div class="bl-card" style="margin-top:4px">',
    '  <h3>Evaluasi ' + blEsc(b.judul) + '</h3>',
    '  <p class="bl-note" style="margin:0 0 12px">Jawab semua soal. Nilai terbaik yang dihitung; evaluasi bisa diulang jika belum mencapai KKM. Soal dilindungi: menyalin, klik kanan, dan tangkapan layar dinonaktifkan.</p>',
    '  <p class="bl-assessment-live" id="bl-assessment-live" aria-live="polite"></p>',
    '  <p class="bl-timer" id="bl-timer" aria-live="polite"></p>',
    (b.soal || []).map(function (s, i) { return blRenderSoal(s, i); }).join(''),
    '  <div class="bl-actions">',
    '    <button class="bl-btn primary" id="bl-submit">Kirim Jawaban</button>',
    '    <button class="bl-btn ghost" id="bl-cancel">Batal</button>',
    '  </div>',
    '</div>'
  ].join('');

  document.getElementById('bl-submit').addEventListener('click', blSubmit);
  document.getElementById('bl-cancel').addEventListener('click', function () {
    blStopExamTimer();
    host.innerHTML = '';
  });
  blSetupExamGuard();
  blStartExamTimer(b.soal || []);
  blBindInputs();
  blRestoreInputs();
  blUpdateProgressDisplay();
}

function blRestoreInputs() {
  const b = blState.bab;
  document.querySelectorAll('#bl-eval input[data-soal]').forEach(function (inp) {
    const answer = blState.answers[inp.dataset.soal];
    if (inp.dataset.idx !== undefined) {
      inp.checked = Array.isArray(answer) && answer[Number(inp.dataset.idx)] === inp.value;
    } else if (inp.type === 'checkbox') {
      inp.checked = Array.isArray(answer) && answer.indexOf(Number(inp.value)) >= 0;
    } else {
      inp.checked = answer === Number(inp.value);
    }
  });
  document.querySelectorAll('#bl-eval select[data-soal]').forEach(function (sel) {
    const answer = blState.answers[sel.dataset.soal];
    const value = Array.isArray(answer) ? answer[Number(sel.dataset.idx)] : '';
    sel.value = Number.isInteger(value) ? String(value) : '';
  });
  (b.soal || []).forEach(function (soal) {
    document.querySelectorAll('#bl-eval .bl-opt[data-soal="' + soal.id + '"]').forEach(function (el) {
      el.classList.toggle('sel', !!el.querySelector('input:checked'));
    });
  });
}

function blRenderSoal(s, i) {
  const st = s.stimulus || {};
  const imgUrl = s.image || s.gambar || st.image || st.gambar;
  const ytId = typeof lmsYoutubeVideoId === 'function'
    ? lmsYoutubeVideoId(s.youtube_id || st.youtube_id)
    : '';
  const media = imgUrl
    ? '<figure class="bl-figure"><img src="' + blEsc(imgUrl) + '" alt="Ilustrasi soal ' + (i + 1) + '" loading="lazy"></figure>'
    : '';
  const video = ytId
    ? '<div class="bl-video"><iframe src="' + blEsc(lmsYoutubeEmbedUrl(ytId)) + '" title="Video pendukung soal ' + (i + 1) + '" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>'
    : '';

  const stim = [
    '<div class="bl-stim">',
    st.judul ? '<h4>' + blEsc(st.judul) + '</h4>' : '',
    media,
    video,
    typeof lmsSanitize === 'function' ? lmsSanitize(st.isi || '') : '',
    st.sumber ? '<span class="src">Sumber: ' + blEsc(st.sumber) + '</span>' : '',
    '</div>'
  ].join('');

  let input = '';
  if (s.tipe === 'pg_singkat' || s.tipe === 'pgm') {
    input = '<div class="bl-opts">' + (s.opsi || []).map(function (o, oi) {
      return '<label class="bl-opt" data-soal="' + s.id + '" data-val="' + oi + '">' +
        '<input type="radio" name="q-' + s.id + '" value="' + oi + '" data-soal="' + s.id + '"> <span>' + String.fromCharCode(65 + oi) + '. ' + blEsc(o) + '</span></label>';
    }).join('') + '</div>';
  } else if (s.tipe === 'pg_kompleks') {
    input = '<div class="bl-opts">' + (s.opsi || []).map(function (o, oi) {
      return '<label class="bl-opt" data-soal="' + s.id + '" data-val="' + oi + '">' +
        '<input type="checkbox" name="q-' + s.id + '" value="' + oi + '" data-soal="' + s.id + '"> <span>' + String.fromCharCode(65 + oi) + '. ' + blEsc(o) + '</span></label>';
    }).join('') + '</div>';
  } else if (s.tipe === 'menjodohkan') {
    input = '<div class="bl-pairs">' + (s.kiri || []).map(function (k, ki) {
      const opts = (s.kanan || []).map(function (r, ri) {
        return '<option value="' + ri + '">' + blEsc(r) + '</option>';
      }).join('');
      return '<div class="bl-pair"><span>' + (ki + 1) + '. ' + blEsc(k) + '</span>' +
        '<select data-soal="' + s.id + '" data-idx="' + ki + '"><option value="">— pilih —</option>' + opts + '</select></div>';
    }).join('') + '</div>';
  } else if (s.tipe === 'benar_salah') {
    input = '<div class="bl-bs">' + (s.pernyataan || []).map(function (p, pi) {
      return '<div class="bl-bs-row"><span>' + (pi + 1) + '. ' + blEsc(p) + '</span><span class="opts">' +
        '<label><input type="radio" name="bs-' + s.id + '-' + pi + '" value="B" data-soal="' + s.id + '" data-idx="' + pi + '"> Benar</label>' +
        '<label><input type="radio" name="bs-' + s.id + '-' + pi + '" value="S" data-soal="' + s.id + '" data-idx="' + pi + '"> Salah</label>' +
        '</span></div>';
    }).join('') + '</div>';
  }

  return [
    '<div class="bl-q">',
    '  <div class="bl-q-head"><span class="bl-q-no">Soal ' + (i + 1) + ' · ' + (TIPE_LABEL[s.tipe] || s.tipe) + '</span>' +
    (s.level ? '<span class="bl-chip">' + blEsc(s.level) + '</span>' : '') +
    (s.numerasi && s.numerasi !== 'Tidak dominan' ? '<span class="bl-chip">Numerasi</span>' : '') +
    (s.literasi ? '<span class="bl-chip">Literasi</span>' : '') + '</div>',
    stim,
    '  <p class="bl-question">' + blEsc(s.pertanyaan) + '</p>',
    input,
    '</div>'
  ].join('');
}

function blBindInputs() {
  document.querySelectorAll('#bl-eval input[type=radio]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      const soal = inp.dataset.soal;
      if (inp.dataset.idx !== undefined) {
        const arr = blState.answers[soal] || [];
        arr[Number(inp.dataset.idx)] = inp.value;
        blState.answers[soal] = arr;
      } else {
        blState.answers[soal] = Number(inp.value);
      }
      document.querySelectorAll('#bl-eval .bl-opt[data-soal="' + soal + '"]').forEach(function (el) {
        el.classList.toggle('sel', !!el.querySelector('input:checked'));
      });
      blUpdateProgressDisplay();
      blQueueProgressSave();
    });
  });

  document.querySelectorAll('#bl-eval input[type=checkbox]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      const soal = inp.dataset.soal;
      const arr = (blState.answers[soal] || []).filter(function (v) { return v !== undefined; }).map(Number);
      const val = Number(inp.value);
      const idx = arr.indexOf(val);
      if (inp.checked && idx < 0) arr.push(val);
      if (!inp.checked && idx >= 0) arr.splice(idx, 1);
      blState.answers[soal] = arr;
      document.querySelectorAll('#bl-eval .bl-opt[data-soal="' + soal + '"]').forEach(function (el) {
        el.classList.toggle('sel', !!el.querySelector('input:checked'));
      });
      blUpdateProgressDisplay();
      blQueueProgressSave();
    });
  });

  document.querySelectorAll('#bl-eval select[data-soal]').forEach(function (sel) {
    sel.addEventListener('change', function () {
      const soal = sel.dataset.soal;
      const arr = blState.answers[soal] || [];
      arr[Number(sel.dataset.idx)] = sel.value === '' ? '' : Number(sel.value);
      blState.answers[soal] = arr;
      blUpdateProgressDisplay();
      blQueueProgressSave();
    });
  });
}

async function blSubmit() {
  const b = blState.bab;
  const gateRemaining = blExamGateRemaining();
  if (gateRemaining > 0) {
    blRenderExamTimer();
    blShowShield('Waktu baca belum realistis. Tunggu ' + blFormatDuration(gateRemaining) + ' lagi sebelum mengirim jawaban.');
    return;
  }
  const btn = document.getElementById('bl-submit');
  btn.disabled = true;
  btn.textContent = 'Mengirim…';
  blState.examSubmitting = true;
  try {
    if (blProgressTimer) {
      clearTimeout(blProgressTimer);
      blProgressTimer = null;
    }
    await blSaveProgress();
    const result = await blApi('/api/kurikulum/' + encodeURIComponent(b.id) + '/evaluasi', {
      method: 'POST',
      body: JSON.stringify({ answers: blState.answers })
    });
    blState.lastResult = result;
    b.progress.attempts = result.attempts;
    b.progress.best_score = result.best_score;
    b.progress.last_answered_count = blCountAnswered(blState.answers, b.soal);
    b.progress.draft_answers = {};
    blUpdateProgressDisplay();
    blRenderResult(result);
    LMS_CACHE.invalidate();
    await Promise.allSettled([renderDashboard(), renderNilai()]);
  } catch (err) {
    blShowProgressSaveError(err);
    alert(err.message);
    btn.disabled = false;
    delete btn.dataset.sending;
    blState.examSubmitting = false;
    blRenderExamTimer();
  }
}

function blRenderResult(r) {
  blStopExamTimer();
  const b = blState.bab;
  const host = document.getElementById('bl-eval');
  document.querySelectorAll('.bl-topic-nav-footer, .bl-topic-pos').forEach(function (el) {
    el.remove();
  });
  const review = r.hasil.map(function (h, i) {
    const soal = b.soal[i];
    return '<div class="bl-rev ' + (h.poin === 1 ? 'b' : 's') + '">' +
      '<div class="head">Soal ' + (i + 1) + ' — ' + (h.poin === 1 ? 'Benar' : (h.poin > 0 ? 'Sebagian benar (' + h.poin + ')' : 'Salah')) + '</div>' +
      '<div class="key">Kunci: ' + blKunciTeks(soal, h.kunci) + '</div>' +
      '<div style="color:#374151;margin-top:3px">' + blEsc(h.pembahasan) + '</div>' +
      '</div>';
  }).join('');

  host.innerHTML = [
    '<div class="bl-result ' + (r.tuntas ? 'ok' : 'no') + '">',
    '  <div class="bl-score">' + r.score + '</div>',
    '  <div style="font-size:12.5px;color:#374151">KKM ' + r.kkm + ' · ' + r.benar + '/' + r.total + ' benar · nilai akhir ' + r.best_score +
      ' · tertinggi ' + r.highest_score + ' pada pengulangan ke-' + r.highest_attempt +
      ' · pengurangan ' + r.penalty_count + ' poin · dikerjakan ' + r.attempts + '×</div>',
    '  <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:' + (r.tuntas ? '#15803d' : '#b45309') + '">' +
    (r.tuntas ? 'Materi tuntas. Materi berikutnya sudah terbuka.' : 'Belum tuntas. Pelajari pembahasan, lalu kerjakan ulang sampai nilai ≥ KKM.') + '</p>',
    '  <div class="bl-actions">',
    (r.tuntas
      ? '    <button class="bl-btn primary" id="bl-next-bab">Materi berikutnya →</button>'
      : ''),
    '  </div>',
    '</div>',
    '<div class="bl-card"><h3>Pembahasan</h3><div class="bl-review">' + review + '</div></div>',
    '<div class="bl-actions"><button class="bl-btn" id="bl-again">Kerjakan Soal Ulang</button></div>'
  ].join('');

  const againEl = document.getElementById('bl-again');
  if (againEl) againEl.addEventListener('click', function () {
    blState.lastResult = null;
    blState.answers = {};
    blStartEval();
  });

  if (r.tuntas) {
    const box = document.getElementById('bl-steps-bottom');
    if (box) {
      const list = (blState.bab && blState.bab.materi) || [];
      box.innerHTML = list.map(function (m, idx) {
        return '<button class="bl-alur-step ' + (idx === blState.activeTopicIndex ? 'active' : '') + '" data-tidx="' + idx + '">' +
          '<span>' + (idx + 1) + '</span> ' + blEsc(blShortTopicTitle(m.judul)) + '</button>';
      }).join('');
      blBindSteps(function (idx) { blState.activeTopicIndex = idx; blRenderBab(); });
    }
    const hint = document.getElementById('bl-steps-hint');
    if (hint) hint.remove();
  }

  const nextBabEl = document.getElementById('bl-next-bab');
  if (nextBabEl) nextBabEl.addEventListener('click', async function () {
    await blLoadKurikulum();
    const list = (blState.kurikulum && blState.kurikulum.babs) || [];
    const i = list.findIndex(function (x) { return x.id === b.id; });
    const nx = list[i + 1];
    if (nx && nx.unlocked) await blOpenBab(nx.id);
  });

  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function blKunciTeks(soal, kunci) {
  if (!kunci) return '-';
  if (soal.tipe === 'pg_singkat' || soal.tipe === 'pgm') {
    return String.fromCharCode(65 + Number(kunci[0])) + '. ' + blEsc((soal.opsi || [])[kunci[0]] || '');
  }
  if (soal.tipe === 'pg_kompleks') {
    return kunci.map(function (k) { return String.fromCharCode(65 + Number(k)); }).join(', ');
  }
  if (soal.tipe === 'benar_salah') {
    return kunci.map(function (k, i) { return (i + 1) + ': ' + (k === 'B' ? 'Benar' : 'Salah'); }).join(' · ');
  }
  if (soal.tipe === 'menjodohkan') {
    return kunci.map(function (k, i) { return (i + 1) + ' → ' + blEsc((soal.kanan || [])[k] || ''); }).join(' · ');
  }
  return '-';
}

async function blNaikKelas() {
  if (!confirm('Naik ke kelas berikutnya? Pastikan semua materi sudah tuntas.')) return;
  try {
    const r = await blApi('/api/kurikulum/naik-kelas', { method: 'POST', body: '{}' });
    alert('Selamat! Kamu naik ke kelas ' + r.level + '.');
    await blLoadKurikulum();
  } catch (err) {
    alert(err.message);
  }
}