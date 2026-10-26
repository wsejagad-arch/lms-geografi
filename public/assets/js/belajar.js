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

let blState = { kurikulum: null, bab: null, answers: {}, lastResult: null, activeTopicIndex: 0 };

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
  const pct = k.total ? Math.round((k.tuntas / k.total) * 100) : 0;
  const naik = k.naik_kelas;
  const berikutnya = k.babs.find(function (b) { return b.unlocked && !b.tuntas; });

  host.innerHTML = [
    '<div class="bl-wrap">',
    '  <div class="bl-top">',
    '    <div class="bl-level">' + blEsc(k.level) + '</div>',
    '    <div style="flex:1;min-width:180px">',
    '      <h2>Kelas ' + blEsc(k.level) + ' — Geografi</h2>',
    '      <p>' + k.tuntas + ' dari ' + k.total + ' materi tuntas · KKM ' + k.kkm + ' · evaluasi bisa diulang sampai tuntas</p>',
    '    </div>',
    '    <div class="bl-bar"><span style="width:' + pct + '%"></span></div>',
    '    <div class="bl-pct">' + pct + '%</div>',
    '  </div>',
    berikutnya
      ? '  <p class="bl-hint">Lanjutkan: <b>' + blEsc(berikutnya.judul) + '</b>. Materi lain terbuka setelah evaluasi materi sebelumnya tuntas.</p>'
      : '  <p class="bl-hint">Semua materi terbuka. Selesaikan evaluasi untuk menuntaskan bab.</p>',
    '  <div class="bl-list">',
    k.babs.map(function (b) { return blBabCard(b); }).join(''),
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

function blBabCard(b) {
  const locked = !b.unlocked;
  const cls = ['bl-bab'];
  if (b.tuntas) cls.push('done');
  if (locked) cls.push('locked');

  const chip = b.tuntas
    ? '<span class="bl-chip ok">Tuntas · ' + b.best_score + '</span>'
    : (b.best_score !== null ? '<span class="bl-chip warn">Terbaik ' + b.best_score + '</span>' : '<span class="bl-chip">Belum dikerjakan</span>');
  const status = locked
    ? '<span class="bl-chip lock">' + BL_LOCK + ' Terkunci</span>'
    : (b.tuntas ? '<span class="bl-chip ok">Sudah dibuka</span>' : '<span class="bl-chip open">Terbuka</span>');
  const reason = locked ? 'Materi ini terkunci. Selesaikan evaluasi materi sebelumnya (nilai ≥ ' + (blState.kurikulum.kkm) + ') untuk membukanya.' : '';

  return [
    '<article class="' + cls.join(' ') + '" data-id="' + blEsc(b.id) + '" data-locked="' + locked + '" data-reason="' + blEsc(reason) + '" ' + (locked ? 'aria-disabled="true"' : 'tabindex="0" role="button"') + '>',
    '  <div class="bl-num">' + b.urutan + '</div>',
    '  <div class="bl-bab-body">',
    '    <h3>' + blEsc(b.judul) + '</h3>',
    '    <p>' + blEsc(b.ringkasan) + '</p>',
    '    <div class="bl-meta">' + chip + status +
    '<span class="bl-chip">' + b.jumlah_soal + ' soal</span>' +
    '<span class="bl-chip">' + blEsc(b.estimasi || '-') + '</span>' +
    '<span class="bl-chip">' + (b.attempts || 0) + '× dikerjakan</span></div>',
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
    blState.answers = {};
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
  const hasNav = materiList.length > 1;

  const tuntas = p.best_score !== null && p.best_score >= b.kkm;
  const steps = materiList.map(function (m, idx) {
    const locked = !tuntas && idx > blState.activeTopicIndex;
    return '<button class="bl-alur-step ' + (idx === blState.activeTopicIndex ? 'active' : '') + (locked ? ' locked' : '') + '" data-tidx="' + idx + '"' + (locked ? ' disabled' : '') + '>' +
      '<span>' + (idx + 1) + '</span> ' + blEsc(blShortTopicTitle(m.judul)) + (locked ? ' ' + BL_LOCK : '') + '</button>';
  }).join('');

  const navHtml = '';

  const prevBtn = blState.activeTopicIndex > 0
    ? '<button class="bl-btn" id="bl-btn-prev-topic">← Sebelumnya</button>' : '<div></div>';
  const nextBtn = blState.activeTopicIndex < materiList.length - 1
    ? '<button class="bl-btn primary" id="bl-btn-next-topic"' + (tuntas ? '' : ' disabled title="Selesaikan evaluasi dulu"') + '>Bagian berikutnya →</button>'
    : '<button class="bl-btn primary" id="bl-btn-finish-topic">Lanjut ke Evaluasi ↓</button>';

  const topicHtml = [
    '<div class="bl-card bl-topic-card" id="bl-active-topic">',
    '  <h3>' + blEsc(cur.judul) + '</h3>',
    blFig(cur),
    '  <div class="bl-prose">' + (cur.html || '') + '</div>',
    '  <div class="bl-topic-nav-footer">' + prevBtn + nextBtn + '</div>',
    '  <div class="bl-topic-pos">Bagian ' + (blState.activeTopicIndex + 1) + ' dari ' + materiList.length + '</div>',
    '</div>'
  ].join('');

  const glos = (b.glosarium || []).map(function (g) {
    return '<div><b>' + blEsc(g.istilah) + '</b> — ' + blEsc(g.arti) + '</div>';
  }).join('');

  host.innerHTML = [
    '<div class="bl-wrap">',
    '  <div class="bl-detail-head">',
    '    <button class="bl-btn ghost" id="bl-back">← Daftar materi</button>',
    '    <h2>' + b.urutan + '. ' + blEsc(b.judul) + '</h2>',
    '    <p>' + blEsc(b.cp || '') + '</p>',
    '  </div>',
    '  <div class="bl-card">',
    '    <h3>Tujuan Pembelajaran</h3>',
    '    <ul class="bl-goal">' + (b.tujuan || []).map(function (t) { return '<li>' + blEsc(t) + '</li>'; }).join('') + '</ul>',
    '  </div>',
    navHtml,
    '<div id="bl-topic-container">' + topicHtml + '</div>',
    glos ? '<div class="bl-card" id="bl-glosarium-card"><h3>Glosarium</h3><div class="bl-glos">' + glos + '</div></div>' : '',
    '  <div class="bl-card" id="bl-eval-card">',
    '    <h3>Evaluasi Materi</h3>',
    '    <p class="bl-note" style="margin:0 0 10px">Nilai terbaik: <b>' + (p.best_score === null ? '—' : p.best_score) + '</b> · dikerjakan ' + p.attempts + '× · KKM ' + b.kkm + '. Evaluasi bisa diulang bila nilai belum mencapai KKM; materi berikutnya terbuka setelah tuntas.</p>',
    '    <div class="bl-actions" style="margin-top:0">',
    '      <button class="bl-btn primary" id="bl-start">' + (p.attempts > 0 ? 'Kerjakan Ulang' : 'Mulai Evaluasi') + '</button>',
    '      <button class="bl-btn ghost" id="bl-back-2">Daftar materi</button>',
    '    </div>',
    '  </div>',
    p.riwayat && p.riwayat.length ? '<div class="bl-card"><h3>Riwayat Percobaan</h3><div class="bl-glos">' + p.riwayat.map(function (r) { return '<div>Percobaan ' + r.ke + ': <b>' + r.score + '</b> (' + r.benar + '/' + r.total + ' benar)</div>'; }).join('') + '</div></div>' : '',
    '  <div id="bl-eval"></div>',
    materiList.length > 1
      ? '<div class="bl-card" id="bl-topic-nav"><h3>Lanjutan Materi</h3>' +
        '<div class="bl-alur-steps" id="bl-steps-bottom">' + steps + '</div>' +
        (tuntas ? '' : '<p class="bl-note" id="bl-steps-hint" style="margin:8px 0 0">Topik berikutnya terbuka setelah evaluasi tuntas (nilai ≥ ' + b.kkm + ').</p>') +
        '</div>'
      : '',
    '</div>'
  ].join('');

  document.getElementById('bl-back').addEventListener('click', blLoadKurikulum);
  document.getElementById('bl-back-2').addEventListener('click', blLoadKurikulum);
  document.getElementById('bl-start').addEventListener('click', blStartEval);

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
    document.getElementById('bl-eval-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function blStartEval() {
  const b = blState.bab;
  blState.answers = {};
  const host = document.getElementById('bl-eval');
  host.innerHTML = [
    '<div class="bl-card" style="margin-top:4px">',
    '  <h3>Evaluasi ' + blEsc(b.judul) + '</h3>',
    '  <p class="bl-note" style="margin:0 0 12px">Jawab semua soal. Nilai terbaik yang dihitung; evaluasi bisa diulang jika belum mencapai KKM.</p>',
    (b.soal || []).map(function (s, i) { return blRenderSoal(s, i); }).join(''),
    '  <div class="bl-actions">',
    '    <button class="bl-btn primary" id="bl-submit">Kirim Jawaban</button>',
    '    <button class="bl-btn ghost" id="bl-cancel">Batal</button>',
    '  </div>',
    '</div>'
  ].join('');

  document.getElementById('bl-submit').addEventListener('click', blSubmit);
  document.getElementById('bl-cancel').addEventListener('click', function () { host.innerHTML = ''; });
  blBindInputs();
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function blRenderSoal(s, i) {
  const st = s.stimulus || {};
  const imgUrl = s.image || s.gambar || st.image || st.gambar;
  const ytId = s.youtube_id || st.youtube_id;
  const media = [
    imgUrl ? '<figure class="bl-figure"><img src="' + blEsc(imgUrl) + '" alt="Ilustrasi soal ' + (i + 1) + '" loading="lazy"></figure>' : '',
    ytId ? '<div class="bl-video"><iframe src="https://www.youtube.com/embed/' + encodeURIComponent(ytId) + '?rel=0" allowfullscreen></iframe></div>' : ''
  ].join('');

  const stim = [
    '<div class="bl-stim">',
    st.judul ? '<h4>' + blEsc(st.judul) + '</h4>' : '',
    media,
    st.isi || '',
    st.sumber ? '<span class="src">Sumber: ' + blEsc(st.sumber) + '</span>' : '',
    '</div>'
  ].join('');

  let input = '';
  if (s.tipe === 'pgm' || s.tipe === 'pg_singkat') {
    input = '<div class="bl-opts">' + (s.opsi || []).map(function (o, oi) {
      return '<label class="bl-opt" data-soal="' + s.id + '" data-val="' + oi + '">' +
        '<input type="radio" name="q-' + s.id + '" value="' + oi + '"> <span>' + String.fromCharCode(65 + oi) + '. ' + blEsc(o) + '</span></label>';
    }).join('') + '</div>';
  } else if (s.tipe === 'pg_kompleks') {
    input = '<div class="bl-opts">' + (s.opsi || []).map(function (o, oi) {
      return '<label class="bl-opt" data-soal="' + s.id + '" data-val="' + oi + '">' +
        '<input type="checkbox" name="q-' + s.id + '" value="' + oi + '"> <span>' + String.fromCharCode(65 + oi) + '. ' + blEsc(o) + '</span></label>';
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
    });
  });

  document.querySelectorAll('#bl-eval select[data-soal]').forEach(function (sel) {
    sel.addEventListener('change', function () {
      const soal = sel.dataset.soal;
      const arr = blState.answers[soal] || [];
      arr[Number(sel.dataset.idx)] = sel.value === '' ? '' : Number(sel.value);
      blState.answers[soal] = arr;
    });
  });
}

async function blSubmit() {
  const b = blState.bab;
  const btn = document.getElementById('bl-submit');
  btn.disabled = true;
  btn.textContent = 'Mengirim…';
  try {
    const result = await blApi('/api/kurikulum/' + encodeURIComponent(b.id) + '/evaluasi', {
      method: 'POST',
      body: JSON.stringify({ answers: blState.answers })
    });
    blState.lastResult = result;
    blRenderResult(result);
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = 'Kirim Jawaban';
  }
}

function blRenderResult(r) {
  const b = blState.bab;
  const host = document.getElementById('bl-eval');
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
    '  <div style="font-size:12.5px;color:#374151">KKM ' + r.kkm + ' · ' + r.benar + '/' + r.total + ' benar · nilai terbaik ' + r.best_score + ' · dikerjakan ' + r.attempts + '×</div>',
    '  <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:' + (r.tuntas ? '#15803d' : '#b45309') + '">' +
    (r.tuntas ? 'Materi tuntas. Materi berikutnya sudah terbuka.' : 'Belum tuntas. Pelajari pembahasan, lalu kerjakan ulang sampai nilai ≥ KKM.') + '</p>',
    '  <div class="bl-actions">',
    (r.tuntas
      ? '    <button class="bl-btn primary" id="bl-next-bab">Materi berikutnya →</button>'
      : '    <button class="bl-btn primary" id="bl-again">Kerjakan Ulang</button>'),
    '    <button class="bl-btn" id="bl-tolist">Daftar Materi</button>',
    '  </div>',
    '</div>',
    '<div class="bl-card"><h3>Pembahasan</h3><div class="bl-review">' + review + '</div></div>'
  ].join('');

  const againEl = document.getElementById('bl-again');
  if (againEl) againEl.addEventListener('click', function () { blOpenBab(b.id).then(blStartEval); });

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

  document.getElementById('bl-tolist').addEventListener('click', blLoadKurikulum);
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function blKunciTeks(soal, kunci) {
  if (!kunci) return '-';
  if (soal.tipe === 'pgm' || soal.tipe === 'pg_singkat') {
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