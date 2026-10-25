// ===== PEMBELAJARAN BERJENJANG (SISWA) =====
const TIPE_LABEL = {
  pgm: 'Pilihan Ganda Majemuk',
  pg_singkat: 'Pilihan Ganda',
  pg_kompleks: 'Pilihan Ganda Kompleks',
  menjodohkan: 'Menjodohkan',
  benar_salah: 'Benar–Salah'
};

let blState = { kurikulum: null, bab: null, answers: {}, lastResult: null, activeTopicIndex: 0, topicViewMode: 'stepped' };

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

async function blLoadKurikulum() {
  const host = document.getElementById('belajar-root');
  if (!host) return;
  host.innerHTML = '<p style="color:#5b6473;font-size:13px">Memuat materi…</p>';
  try {
    blState.kurikulum = await blApi('/api/kurikulum');
    blRenderList();
  } catch (err) {
    host.innerHTML = '<p style="color:#dc2626;font-size:13px">' + err.message + '</p>';
  }
}

function blRenderList() {
  const k = blState.kurikulum;
  const host = document.getElementById('belajar-root');
  const pct = k.total ? Math.round((k.tuntas / k.total) * 100) : 0;
  const naik = k.naik_kelas;

  host.innerHTML = [
    '<div class="bl-wrap">',
    '  <div class="bl-top">',
    '    <div class="bl-level">' + k.level + '</div>',
    '    <div style="flex:1;min-width:180px">',
    '      <h2>Kelas ' + k.level + ' — Geografi</h2>',
    '      <p>' + k.tuntas + ' dari ' + k.total + ' bab tuntas · KKM ' + k.kkm + ' · maksimal ' + k.max_attempts + ' percobaan per bab</p>',
    '    </div>',
    '    <div class="bl-bar"><span style="width:' + pct + '%"></span></div>',
    '    <div class="bl-pct">' + pct + '%</div>',
    '  </div>',
    '  <div class="bl-list">',
    k.babs.map(function (b) { return blBabCard(b); }).join(''),
    '  </div>',
    '  <div class="bl-actions">',
    '    <button class="bl-btn primary" id="bl-naik" ' + (naik.eligible ? '' : 'disabled') + '>Naik ke Kelas ' + (naik.level_berikut || '-') + '</button>',
    '    <button class="bl-btn" id="bl-refresh">Muat ulang</button>',
    '  </div>',
    '  <p style="font-size:11.5px;color:#8b95a5;margin-top:10px">' + naik.alasan + '</p>',
    '</div>'
  ].join('');

  host.querySelectorAll('.bl-bab').forEach(function (el) {
    el.addEventListener('click', function () {
      if (el.classList.contains('locked')) return;
      blOpenBab(el.dataset.id);
    });
  });
  document.getElementById('bl-refresh').addEventListener('click', blLoadKurikulum);
  document.getElementById('bl-naik').addEventListener('click', blNaikKelas);
}

function blBabCard(b) {
  const cls = ['bl-bab'];
  if (b.tuntas) cls.push('done');
  if (!b.unlocked) cls.push('locked');
  const chip = b.tuntas
    ? '<span class="bl-chip ok">Tuntas · ' + b.best_score + '</span>'
    : (b.best_score !== null ? '<span class="bl-chip warn">Nilai terbaik ' + b.best_score + '</span>' : '<span class="bl-chip">Belum dikerjakan</span>');
  const sisa = '<span class="bl-chip">' + b.attempts_left + ' percobaan tersisa</span>';
  const lock = b.unlocked ? '' : '<span class="bl-chip lock">Terkunci</span>';
  return [
    '<div class="' + cls.join(' ') + '" data-id="' + b.id + '">',
    '  <div class="bl-num">' + b.urutan + '</div>',
    '  <div class="bl-bab-body">',
    '    <h3>' + b.judul + '</h3>',
    '    <p>' + b.ringkasan + '</p>',
    '    <div class="bl-meta">' + chip + sisa + '<span class="bl-chip">' + b.jumlah_soal + ' soal</span><span class="bl-chip">' + (b.estimasi || '-') + '</span>' + lock + '</div>',
    '  </div>',
    '</div>'
  ].join('');
}

function blShortTopicTitle(title) {
  if (!title) return 'Topik';
  const m = title.match(/^(?:Topik\s*\d+\s*:\s*)?([^—–:-]+)/i);
  let short = m && m[1] ? m[1].trim() : title.trim();
  if (short.length > 28) short = short.substring(0, 26) + '…';
  return short;
}

async function blOpenBab(id) {
  const host = document.getElementById('belajar-root');
  host.innerHTML = '<p style="color:#5b6473;font-size:13px">Memuat bab…</p>';
  try {
    blState.bab = await blApi('/api/kurikulum/' + encodeURIComponent(id));
    blState.answers = {};
    blState.lastResult = null;
    blState.activeTopicIndex = 0;
    blState.topicViewMode = 'stepped';
    blRenderBab();
  } catch (err) {
    host.innerHTML = '<p style="color:#dc2626;font-size:13px">' + err.message + '</p>';
  }
}

function blRenderBab() {
  const b = blState.bab;
  const p = b.progress;
  const host = document.getElementById('belajar-root');
  const materiList = b.materi || [];
  const hasMultiple = materiList.length > 1;

  let topicNavHtml = '';
  let topicBodyHtml = '';

  if (hasMultiple) {
    const stepsHtml = materiList.map(function (m, idx) {
      const isAct = idx === blState.activeTopicIndex && blState.topicViewMode === 'stepped';
      return '<button class="bl-alur-step ' + (isAct ? 'active' : '') + '" data-tidx="' + idx + '">' +
        '<span>' + (idx + 1) + '</span> ' + blEsc(blShortTopicTitle(m.judul)) +
        '</button>';
    }).join('');

    topicNavHtml = [
      '<div class="bl-alur-bar" id="bl-topic-nav">',
      '  <div class="bl-alur-head">',
      '    <div class="bl-alur-title">',
      '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>',
      '      Alur Pembelajaran: ' + (blState.topicViewMode === 'stepped' ? 'Topik ' + (blState.activeTopicIndex + 1) + ' dari ' + materiList.length : 'Semua Topik (' + materiList.length + ')'),
      '    </div>',
      '    <button class="bl-alur-toggle" id="bl-toggle-mode">',
      blState.topicViewMode === 'stepped' ? 'Tampilkan Semua Sekaligus 📜' : 'Mode Alur Bertahap 📖',
      '    </button>',
      '  </div>',
      '  <div class="bl-alur-steps">' + stepsHtml + '</div>',
      '</div>'
    ].join('');

    if (blState.topicViewMode === 'stepped') {
      const cur = materiList[blState.activeTopicIndex] || materiList[0];
      const prevM = blState.activeTopicIndex > 0 ? materiList[blState.activeTopicIndex - 1] : null;
      const nextM = blState.activeTopicIndex < materiList.length - 1 ? materiList[blState.activeTopicIndex + 1] : null;

      topicBodyHtml = [
        '<div class="bl-card bl-topic-card" id="bl-active-topic">',
        '  <span class="bl-topic-badge">Bagian ' + (blState.activeTopicIndex + 1) + ' dari ' + materiList.length + '</span>',
        '  <h3>' + blEsc(cur.judul) + '</h3>',
        '  <div class="bl-prose">' + cur.html + '</div>',
        '  <div class="bl-topic-nav-footer">',
        prevM ? '<button class="bl-btn" id="bl-btn-prev-topic">← Topik Sebelumnya: ' + blEsc(blShortTopicTitle(prevM.judul)) + '</button>' : '<div></div>',
        nextM
          ? '<button class="bl-btn primary" id="bl-btn-next-topic">Menu Berikutnya: ' + blEsc(blShortTopicTitle(nextM.judul)) + ' →</button>'
          : '<button class="bl-btn primary" id="bl-btn-finish-topic">Lanjut ke Glosarium & Evaluasi ↓</button>',
        '  </div>',
        '</div>'
      ].join('');
    } else {
      topicBodyHtml = materiList.map(function (m, idx) {
        return '<div class="bl-card" id="bl-materi-' + idx + '"><span class="bl-topic-badge">Topik ' + (idx + 1) + '</span><h3>' + blEsc(m.judul) + '</h3><div class="bl-prose">' + m.html + '</div></div>';
      }).join('');
    }
  } else {
    topicBodyHtml = materiList.map(function (m) {
      return '<div class="bl-card"><h3>' + blEsc(m.judul) + '</h3><div class="bl-prose">' + m.html + '</div></div>';
    }).join('');
  }

  const glos = (b.glosarium || []).map(function (g) {
    return '<div><b>' + blEsc(g.istilah) + '</b> — ' + blEsc(g.arti) + '</div>';
  }).join('');

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
    topicNavHtml,
    '<div id="bl-topic-container">' + topicBodyHtml + '</div>',
    glos ? '<div class="bl-card" id="bl-glosarium-card"><h3>Glosarium</h3><div class="bl-glos">' + glos + '</div></div>' : '',
    '  <div class="bl-card" id="bl-eval-card">',
    '    <h3>Evaluasi</h3>',
    '    <p style="font-size:12.5px;color:#5b6473;margin:0 0 10px">Nilai terbaik: <b>' + (p.best_score === null ? '—' : p.best_score) + '</b> · percobaan: ' + p.attempts + '/' + (p.attempts + p.attempts_left) + ' · nilai tertinggi yang diambil.</p>',
    '    <div class="bl-actions" style="margin-top:0">',
    '      <button class="bl-btn primary" id="bl-start" ' + (p.attempts_left > 0 ? '' : 'disabled') + '>' + (p.attempts > 0 ? 'Kerjakan Ulang' : 'Mulai Evaluasi') + '</button>',
    '      <button class="bl-btn ghost" id="bl-back">Kembali</button>',
    '    </div>',
    '  </div>',
    p.riwayat && p.riwayat.length ? '<div class="bl-card"><h3>Riwayat Percobaan</h3><div class="bl-glos">' + p.riwayat.map(function (r) { return '<div>Percobaan ' + r.ke + ': <b>' + r.score + '</b> (' + r.benar + '/' + r.total + ' benar)</div>'; }).join('') + '</div></div>' : '',
    '  <div id="bl-eval"></div>',
    '</div>'
  ].join('');

  document.getElementById('bl-back').addEventListener('click', blLoadKurikulum);
  document.getElementById('bl-start').addEventListener('click', blStartEval);

  if (hasMultiple) {
    document.querySelectorAll('.bl-alur-step').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const tidx = Number(btn.dataset.tidx);
        blState.activeTopicIndex = tidx;
        blState.topicViewMode = 'stepped';
        blRenderBab();
        const navEl = document.getElementById('bl-topic-nav');
        if (navEl) navEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const toggleBtn = document.getElementById('bl-toggle-mode');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        blState.topicViewMode = blState.topicViewMode === 'stepped' ? 'all' : 'stepped';
        blRenderBab();
        const navEl = document.getElementById('bl-topic-nav');
        if (navEl) navEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const prevBtn = document.getElementById('bl-btn-prev-topic');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (blState.activeTopicIndex > 0) {
          blState.activeTopicIndex--;
          blRenderBab();
          const navEl = document.getElementById('bl-topic-nav');
          if (navEl) navEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    const nextBtn = document.getElementById('bl-btn-next-topic');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (blState.activeTopicIndex < materiList.length - 1) {
          blState.activeTopicIndex++;
          blRenderBab();
          const navEl = document.getElementById('bl-topic-nav');
          if (navEl) navEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    const finishBtn = document.getElementById('bl-btn-finish-topic');
    if (finishBtn) {
      finishBtn.addEventListener('click', function () {
        const evalEl = document.getElementById('bl-eval-card');
        if (evalEl) evalEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }
}

function blEsc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function blStartEval() {
  const b = blState.bab;
  blState.answers = {};
  const host = document.getElementById('bl-eval');
  host.innerHTML = [
    '<div class="bl-card" style="margin-top:4px">',
    '  <h3>Evaluasi ' + blEsc(b.judul) + '</h3>',
    '  <p style="font-size:12px;color:#5b6473;margin:0 0 12px">Jawab semua soal. Nilai tertinggi dari maksimal 3 percobaan yang dihitung.</p>',
    (b.soal || []).map(function (s, i) { return blRenderSoal(s, i); }).join(''),
    '  <div class="bl-actions">',
    '    <button class="bl-btn primary" id="bl-submit">Kirim Jawaban</button>',
    '    <button class="bl-btn ghost" id="bl-cancel">Batal</button>',
    '  </div>',
    '</div>'
  ].join('');

  document.getElementById('bl-cancel').addEventListener('click', function () { host.innerHTML = ''; });
  document.getElementById('bl-submit').addEventListener('click', blSubmit);
  blBindInputs();
}

function blRenderSoal(s, i) {
  const st = s.stimulus || {};
  const stim = [
    '<div class="bl-stim">',
    st.judul ? '<h4>' + blEsc(st.judul) + '</h4>' : '',
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
    const kunciTeks = blKunciTeks(soal, h.kunci);
    return '<div class="bl-rev ' + (h.poin === 1 ? 'b' : 's') + '">' +
      '<div class="head">Soal ' + (i + 1) + ' — ' + (h.poin === 1 ? 'Benar' : (h.poin > 0 ? 'Sebagian benar (' + h.poin + ')' : 'Salah')) + '</div>' +
      '<div class="key">Kunci: ' + kunciTeks + '</div>' +
      '<div style="color:#374151;margin-top:3px">' + blEsc(h.pembahasan) + '</div>' +
      '</div>';
  }).join('');

  host.innerHTML = [
    '<div class="bl-result ' + (r.tuntas ? 'ok' : 'no') + '">',
    '  <div class="bl-score">' + r.score + '</div>',
    '  <div style="font-size:12.5px;color:#374151">KKM ' + r.kkm + ' · ' + r.benar + '/' + r.total + ' benar · nilai terbaik ' + r.best_score + ' · sisa ' + r.attempts_left + ' percobaan</div>',
    '  <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:' + (r.tuntas ? '#15803d' : '#b45309') + '">' + (r.tuntas ? 'Bab tuntas. Lanjut ke bab berikutnya.' : 'Belum tuntas. Pelajari pembahasan, lalu coba lagi.') + '</p>',
    '  <div class="bl-actions">',
    '    <button class="bl-btn" id="bl-again">Kembali ke Bab</button>',
    '    <button class="bl-btn primary" id="bl-tolist">Daftar Bab</button>',
    '  </div>',
    '</div>',
    '<div class="bl-card"><h3>Pembahasan</h3><div class="bl-review">' + review + '</div></div>'
  ].join('');

  document.getElementById('bl-again').addEventListener('click', function () { blOpenBab(b.id); });
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
  if (!confirm('Naik ke kelas berikutnya? Pastikan semua bab sudah tuntas.')) return;
  try {
    const r = await blApi('/api/kurikulum/naik-kelas', { method: 'POST', body: '{}' });
    alert('Selamat! Kamu naik ke kelas ' + r.level + '.');
    await blLoadKurikulum();
  } catch (err) {
    alert(err.message);
  }
}
