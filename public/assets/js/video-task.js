// ===== TUGAS MENGAMATI VIDEO (SISI SISWA) =====
// Video diputar lewat YouTube IFrame API tanpa kontrol bawaan. Bilah waktu dikunci:
// siswa tidak bisa melompat ke depan (seek), dan soal bertimestamp wajib dijawab
// sebelum video boleh berlanjut. Nilai dihitung di server dari kunci jawaban.
(function () {
  const state = {
    taskId: null,
    task: null,
    player: null,
    tick: null,
    answers: {},
    answered: new Set(),
    maxWatched: 0,
    watched: 0,
    lastTime: 0,
    questionOpen: false,
    submitting: false,
    finished: false,
    lastSyncAt: 0,
    lastSyncPercent: -1,
    apiPromise: null
  };

  function vtEsc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function vtApi(path, options = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Permintaan gagal');
    return data;
  }

  function vtFmt(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  // Toleransi 1,5 detik memberi ruang untuk pembulatan waktu pemutar; lompatan lebih
  // besar dari itu dianggap upaya melewati video dan posisi dikembalikan.
  function vtIsSkip(current, maxWatched) {
    return Number(current) > Number(maxWatched) + 1.5;
  }

  function vtRoot() {
    return document.getElementById('vt-root');
  }

  function vtSetBusy(root, message) {
    root.innerHTML = `<div class="vt-empty"><div class="vt-empty-icon">🎬</div><b>${vtEsc(message)}</b></div>`;
  }

  async function vtRenderList() {
    const root = vtRoot();
    if (!root) return;
    vtTeardown();
    vtSetBusy(root, 'Memuat tugas video…');
    try {
      const tasks = await vtApi('/video-tasks');
      // Tautan share: student.html?task=<id> langsung membuka tugas bila terlihat
      // untuk kelas siswa. Parameter dibersihkan agar "Daftar tugas" tidak membuka ulang.
      const deepTask = new URLSearchParams(window.location.search).get('task');
      if (deepTask && tasks.some(task => task.id === deepTask)) {
        try { history.replaceState(null, '', window.location.pathname); } catch (error) { /* abaikan */ }
        await vtOpenTask(deepTask);
        return;
      }
      if (!tasks.length) {
        root.innerHTML = '<div class="vt-empty"><div class="vt-empty-icon">🎬</div><b>Belum Ada Tugas Video</b>'
          + '<p>Guru belum menugaskan video pengamatan untuk kelas Anda.</p></div>';
        return;
      }
      root.innerHTML = `
        <div class="vt-list-head">
          <div>
            <h2>Tugas Mengamati Video</h2>
            <p>Tonton video sampai selesai. Video tidak bisa dilewati dan soal muncul otomatis di dalam video.</p>
          </div>
        </div>
        <div class="vt-grid">
          ${tasks.map(task => {
            const progress = task.progress || {};
            const best = progress.best_score;
            const badge = best === null || best === undefined
              ? '<span class="badge badge-warning">Belum dikerjakan</span>'
              : `<span class="badge ${progress.tuntas ? 'badge-success' : 'badge-danger'}">Nilai ${vtEsc(best)}</span>`;
            return `<article class="vt-card">
              <div class="vt-card-top">
                <span class="vt-card-icon">▶</span>
                <div>
                  <h3>${vtEsc(task.judul)}</h3>
                  <p>${vtEsc(task.deskripsi || 'Amati video dengan saksama, lalu jawab soal yang muncul.')}</p>
                </div>
              </div>
              <div class="vt-meta">
                <span>🎯 ${vtEsc(task.jumlah_soal)} soal</span>
                <span>⏱ ${task.durasi ? vtFmt(task.durasi) : 'Durasi otomatis'}</span>
                <span>🏫 ${vtEsc(task.kelas_nama || 'Semua kelas')}</span>
              </div>
              <div class="vt-card-foot">
                ${badge}
                <button type="button" class="btn btn-primary btn-sm" data-vt-open="${vtEsc(task.id)}">
                  ${best === null || best === undefined ? 'Mulai menonton' : 'Tonton ulang'}
                </button>
              </div>
            </article>`;
          }).join('')}
        </div>`;
      root.querySelectorAll('[data-vt-open]').forEach(button => {
        button.addEventListener('click', () => vtOpenTask(button.dataset.vtOpen));
      });
    } catch (error) {
      vtSetBusy(root, error.message || 'Gagal memuat tugas video');
    }
  }

  function vtLoadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (state.apiPromise) return state.apiPromise;
    state.apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') { try { previous(); } catch (e) { /* abaikan */ } }
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('Gagal memuat pemutar YouTube. Periksa koneksi internet.'));
      document.head.appendChild(script);
    });
    return state.apiPromise;
  }

  async function vtOpenTask(id) {
    const root = vtRoot();
    if (!root) return;
    vtTeardown();
    vtSetBusy(root, 'Menyiapkan video…');
    try {
      const task = await vtApi(`/video-tasks/${encodeURIComponent(id)}`);
      if (!task.soal || !task.soal.length) throw new Error('Tugas video belum memiliki soal');
      state.taskId = task.id;
      state.task = task;
      state.answers = {};
      state.answered = new Set();
      state.maxWatched = 0;
      state.watched = 0;
      state.lastTime = 0;
      state.finished = false;
      state.questionOpen = false;
      state.lastSyncAt = 0;
      state.lastSyncPercent = -1;

      root.innerHTML = `
        <div class="vt-head">
          <button type="button" class="btn btn-sm" id="vt-back">← Daftar tugas</button>
          <div class="vt-head-text">
            <h2>${vtEsc(task.judul)}</h2>
            <p>${vtEsc(task.deskripsi || '')}</p>
          </div>
        </div>
        <div class="vt-layout">
          <div class="vt-stage" id="vt-stage">
            <div id="vt-player" class="vt-player"></div>
            <div class="vt-lockbar" id="vt-lockbar">
              <span>🔒 Video terkunci — tidak bisa dilewati</span>
              <span id="vt-watch-label">0%</span>
            </div>
            <div class="vt-overlay hidden" id="vt-overlay" role="dialog" aria-modal="true" aria-labelledby="vt-q-text"></div>
            <div class="vt-overlay" id="vt-start">
              <div class="vt-q vt-q-start">
                <div class="vt-q-badge">Tugas mengamati video</div>
                <p class="vt-start-note">Video akan berhenti otomatis di setiap soal. Jawaban terkunci setelah disimpan dan menjadi nilai Anda.</p>
                <button type="button" class="btn btn-primary" id="vt-start-btn">Mulai menonton</button>
                <p class="vt-q-note">${vtEsc(task.jumlah_soal)} soal · batas nilai KKM ${vtEsc(task.progress && task.progress.kkm ? task.progress.kkm : 75)}</p>
              </div>
            </div>
          </div>
          <aside class="vt-side">
            <h3>Soal dalam video</h3>
            <ol class="vt-timeline" id="vt-timeline">
              ${task.soal.map((soal, index) => `
                <li data-soal="${vtEsc(soal.id)}">
                  <span class="vt-time">${vtFmt(soal.waktu)}</span>
                  <span class="vt-soal-label">Soal ${index + 1}</span>
                  <span class="vt-status">menunggu</span>
                </li>`).join('')}
            </ol>
            <p class="vt-side-note">Jangan menutup halaman selama menonton. Jawaban baru bisa dikirim setelah video selesai.</p>
          </aside>
        </div>`;

      document.getElementById('vt-back').addEventListener('click', () => {
        if (!state.finished && Object.keys(state.answers).length) {
          if (!window.confirm('Keluar dari tugas video? Jawaban yang belum dikirim akan hilang.')) return;
        }
        vtRenderList();
      });

      document.getElementById('vt-start-btn').addEventListener('click', () => vtStartPlayer());
    } catch (error) {
      vtSetBusy(root, error.message || 'Gagal membuka tugas video');
    }
  }

  async function vtStartPlayer() {
    try {
      const YT = await vtLoadYouTubeApi();
      const startLayer = document.getElementById('vt-start');
      if (startLayer) startLayer.remove();
      if (state.player) return;

      state.player = new YT.Player('vt-player', {
        videoId: state.task.youtube_id,
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3
        },
        events: {
          onReady: event => {
            event.target.setPlaybackRate(1);
            state.lastTime = 0;
            event.target.playVideo();
            if (!state.tick) state.tick = setInterval(vtTick, 250);
          },
          onStateChange: event => {
            const YTState = window.YT && window.YT.PlayerState;
            if (!YTState) return;
            if (event.data === YTState.PLAYING) {
              if (state.player && typeof state.player.setPlaybackRate === 'function') state.player.setPlaybackRate(1);
              state.lastTime = state.player.getCurrentTime();
            }
            if (event.data === YTState.ENDED && !state.finished) vtSubmit();
          }
        }
      });

      window.addEventListener('beforeunload', vtBeforeUnload);
      window.addEventListener('pagehide', vtPageHide);
    } catch (error) {
      const root = vtRoot();
      if (root) vtSetBusy(root, error.message || 'Gagal memuat pemutar video');
    }
  }

  function vtBeforeUnload(event) {
    if (state.finished || !state.taskId) return undefined;
    event.preventDefault();
    event.returnValue = 'Tugas video belum selesai.';
    return event.returnValue;
  }

  function vtTick() {
    const player = state.player;
    if (!player || typeof player.getCurrentTime !== 'function') return;
    try {
      const current = Number(player.getCurrentTime()) || 0;
      const YTState = window.YT && window.YT.PlayerState;
      const playing = YTState ? player.getPlayerState() === YTState.PLAYING : false;

      // Kunci anti-skip: posisi tidak boleh melampaui rekor tonton sebelumnya.
      if (vtIsSkip(current, state.maxWatched)) {
        player.seekTo(state.maxWatched, true);
        return;
      }
      if (current > state.maxWatched) state.maxWatched = current;

      if (playing) {
        const delta = current - state.lastTime;
        if (delta > 0 && delta < 2.5) state.watched += delta;
      }
      state.lastTime = current;

      vtUpdateWatchLabel();
      vtSyncProgress(false);
      if (!state.questionOpen && !state.finished) {
        const next = state.task.soal.find(soal => !state.answered.has(soal.id) && current >= Number(soal.waktu));
        if (next) vtAskQuestion(next);
      }
    } catch (error) {
      // Pemutar belum siap; coba lagi pada tick berikutnya.
    }
  }

  function vtWatchPercent() {
    if (!state.task) return 0;
    const total = Number(state.task.durasi) || 0;
    if (total) return Math.max(0, Math.min(100, Math.round((state.maxWatched / total) * 100)));
    const required = Math.max(1, Number(state.task.required_watch_seconds) || 1);
    return Math.max(0, Math.min(100, Math.round((state.watched / required) * 100)));
  }

  function vtUpdateWatchLabel() {
    const label = document.getElementById('vt-watch-label');
    if (!label || !state.task) return;
    label.textContent = `${vtWatchPercent()}%`;
  }

  // Kirim progres tontonan agar guru melihat persentase "sedang menonton" di rekap.
  function vtSyncProgress(force) {
    if (!state.taskId || !state.task || state.finished) return;
    const percent = vtWatchPercent();
    if (percent <= 0) return;
    const now = Date.now();
    if (!force && (percent <= state.lastSyncPercent || now - state.lastSyncAt < 10000)) return;
    state.lastSyncAt = now;
    state.lastSyncPercent = percent;
    const body = JSON.stringify({
      watched_seconds: Math.round(state.watched),
      position: Math.round(state.maxWatched)
    });
    const url = `/api/video-tasks/${encodeURIComponent(state.taskId)}/progress`;
    try {
      if (force && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        return;
      }
      fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => {});
    } catch (error) {
      // Progres bersifat pelengkap; kegagalan kirim tidak menghentikan tugas.
    }
  }

  function vtPageHide() {
    vtSyncProgress(true);
  }

  function vtAskQuestion(soal) {
    state.questionOpen = true;
    if (state.player && typeof state.player.pauseVideo === 'function') state.player.pauseVideo();
    const overlay = document.getElementById('vt-overlay');
    const index = state.task.soal.findIndex(item => item.id === soal.id);
    if (!overlay) return;
    const isEssay = soal.tipe === 'uraian';
    overlay.innerHTML = `
      <div class="vt-q ${isEssay ? 'vt-q-essay' : ''}">
        <div class="vt-q-badge">Soal ${index + 1} dari ${state.task.soal.length}${isEssay ? ' · Uraian' : ''}</div>
        <p class="vt-q-text" id="vt-q-text">${vtEsc(soal.pertanyaan)}</p>
        ${isEssay ? `
          <label class="vt-essay-label" for="vt-essay-answer">Jawaban Anda</label>
          <textarea id="vt-essay-answer" class="vt-essay-input" rows="6" maxlength="4000" placeholder="Tulis jawaban analisis Anda..."></textarea>
          <div class="vt-essay-meta"><span id="vt-essay-count">0</span> karakter · minimal 15 karakter</div>
          <button type="button" class="btn btn-primary" id="vt-q-save" disabled>Simpan jawaban & lanjutkan</button>` : `
          <div class="vt-options" role="radiogroup" aria-labelledby="vt-q-text">
            ${(soal.opsi || []).map((opsi, i) => `
              <label class="vt-option">
                <input type="radio" name="vt-answer" value="${i}" data-vt-index="${i}">
                <span class="vt-option-key">${String.fromCharCode(65 + i)}</span>
                <span>${vtEsc(opsi)}</span>
              </label>`).join('')}
          </div>
          <button type="button" class="btn btn-primary" id="vt-q-save" disabled>Simpan jawaban & lanjutkan</button>`}
        <p class="vt-q-note">${isEssay
          ? 'Jawaban dianalisis otomatis dari kemiripan dan relevansi dengan kunci jawaban, lalu dikunci.'
          : 'Jawaban terkunci setelah disimpan dan menjadi bagian dari nilai tugas.'}</p>
      </div>`;
    overlay.classList.remove('hidden');

    const finishAnswer = value => {
      state.answers[soal.id] = value;
      state.answered.add(soal.id);
      state.questionOpen = false;
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      vtMarkTimeline(soal.id);
      if (state.player && typeof state.player.playVideo === 'function') state.player.playVideo();
    };

    if (isEssay) {
      const input = document.getElementById('vt-essay-answer');
      const counter = document.getElementById('vt-essay-count');
      const save = document.getElementById('vt-q-save');
      const sync = () => {
        const length = input.value.trim().length;
        if (counter) counter.textContent = length;
        if (save) save.disabled = length < 15;
      };
      input.addEventListener('input', sync);
      if (save) save.addEventListener('click', () => {
        const answer = input.value.trim().slice(0, 5000);
        if (answer.length < 15) return;
        finishAnswer(answer);
      });
      input.focus();
      return;
    }

    overlay.querySelectorAll('input[name="vt-answer"]').forEach(input => {
      input.addEventListener('change', () => {
        const save = document.getElementById('vt-q-save');
        if (save) save.disabled = false;
      });
    });

    const save = document.getElementById('vt-q-save');
    if (save) {
      save.addEventListener('click', () => {
        const picked = overlay.querySelector('input[name="vt-answer"]:checked');
        if (!picked) return;
        finishAnswer(Number(picked.value));
      });
    }
  }

  function vtMarkTimeline(soalId) {
    const item = document.querySelector(`.vt-timeline li[data-soal="${soalId}"]`);
    if (!item) return;
    item.classList.add('vt-done');
    const status = item.querySelector('.vt-status');
    if (status) status.textContent = 'terjawab';
  }

  async function vtSubmit() {
    if (state.submitting || !state.task) return;
    state.submitting = true;
    const root = vtRoot();
    const stage = document.getElementById('vt-stage');
    const overlay = document.getElementById('vt-overlay');
    if (!stage || !overlay) return;

    const required = Number(state.task.required_watch_seconds) || 0;
    if (state.watched < required * 0.9) {
      overlay.innerHTML = `<div class="vt-q">
        <div class="vt-q-badge">Video belum selesai</div>
        <p class="vt-q-text">Tonton video sampai habis sebelum mengirim jawaban. Durasi tercatat ${Math.round(state.watched)} dari ${required} detik.</p>
        <button type="button" class="btn btn-primary" id="vt-resume">Lanjutkan menonton</button>
      </div>`;
      overlay.classList.remove('hidden');
      state.submitting = false;
      state.questionOpen = true;
      const resume = document.getElementById('vt-resume');
      if (resume) resume.addEventListener('click', () => {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        state.questionOpen = false;
        if (state.player) state.player.playVideo();
      });
      return;
    }

    overlay.innerHTML = `<div class="vt-q"><div class="vt-q-badge">Menyimpan nilai…</div><p class="vt-q-text">Jawaban Anda sedang dinilai oleh server.</p></div>`;
    overlay.classList.remove('hidden');

    try {
      const result = await vtApi(`/video-tasks/${encodeURIComponent(state.task.id)}/attempt`, {
        method: 'POST',
        body: JSON.stringify({
          answers: state.answers,
          watched_seconds: Math.round(state.watched),
          position: Math.round(Math.max(state.maxWatched, 0))
        })
      });
      state.finished = true;
      state.submitting = false;
      state.questionOpen = true;
      window.removeEventListener('beforeunload', vtBeforeUnload);
      window.removeEventListener('pagehide', vtPageHide);
      if (state.tick) { clearInterval(state.tick); state.tick = null; }
      vtRenderResult(result);
    } catch (error) {
      state.submitting = false;
      overlay.innerHTML = `<div class="vt-q">
        <div class="vt-q-badge">Gagal mengirim jawaban</div>
        <p class="vt-q-text">${vtEsc(error.message || 'Terjadi kesalahan')}</p>
        <button type="button" class="btn btn-primary" id="vt-retry">Coba kirim lagi</button>
      </div>`;
      overlay.classList.remove('hidden');
      const retry = document.getElementById('vt-retry');
      if (retry) retry.addEventListener('click', () => {
        state.questionOpen = false;
        vtSubmit();
      });
    }
  }

  function vtRenderResult(result) {
    const root = vtRoot();
    if (!root) return;
    const lulus = result.tuntas;
    root.innerHTML = `
      <div class="vt-head">
        <button type="button" class="btn btn-sm" id="vt-back">← Daftar tugas</button>
        <div class="vt-head-text">
          <h2>${vtEsc(state.task.judul)}</h2>
          <p>Hasil pengamatan video</p>
        </div>
      </div>
      <div class="vt-result ${lulus ? 'vt-result-pass' : 'vt-result-fail'}">
        <div class="vt-score-ring">
          <strong>${vtEsc(result.score)}</strong>
          <span>dari 100</span>
        </div>
        <div class="vt-result-body">
          <span class="badge ${lulus ? 'badge-success' : 'badge-danger'}">${lulus ? 'Tuntas' : 'Belum tuntas'}</span>
          <p>${vtEsc(result.benar)} benar dari ${vtEsc(result.total)} soal · percobaan ke-${vtEsc(result.ke)} · nilai terbaik ${vtEsc(result.best_score)}</p>
          <p class="vt-side-note">KKM ${vtEsc(result.kkm)}. Anda boleh menonton ulang untuk memperbaiki nilai.</p>
        </div>
      </div>
      <div class="vt-review">
        <h3>Pembahasan jawaban</h3>
        ${(result.hasil || []).map((item, index) => {
          const soal = state.task.soal.find(s => s.id === item.soal_id) || {};
          if (item.tipe === 'uraian') {
            const poin = Math.round((Number(item.poin) || 0) * 100);
            return `<article class="vt-review-item ${item.tepat ? 'vt-correct' : 'vt-wrong'}">
              <div class="vt-review-head">
                <span class="vt-review-no">Soal ${index + 1} · Uraian</span>
                <span class="badge ${poin >= 70 ? 'badge-success' : 'badge-danger'}">Poin ${poin}%</span>
              </div>
              <p class="vt-review-q">${vtEsc(soal.pertanyaan || '')}</p>
              <p class="vt-review-line"><b>Jawaban Anda:</b> ${vtEsc(item.jawaban || 'tidak dijawab')}</p>
              <p class="vt-review-line"><b>Kunci jawaban:</b> ${vtEsc(item.kunci || '')}</p>
              <div class="vt-metrics">
                <span class="vt-metric"><b>${vtEsc(item.kemiripan || 0)}%</b> kemiripan</span>
                <span class="vt-metric"><b>${vtEsc(item.relevansi || 0)}%</b> relevansi</span>
                <span class="vt-metric"><b>${vtEsc(item.jumlah_kata || 0)}</b> kata</span>
              </div>
              ${item.kata_hilang && item.kata_hilang.length
                ? `<p class="vt-review-line"><b>Kata kunci belum muncul:</b> ${vtEsc(item.kata_hilang.join(', '))}</p>` : ''}
              ${item.pembahasan ? `<p class="vt-review-line"><b>Pembahasan:</b> ${vtEsc(item.pembahasan)}</p>` : ''}
            </article>`;
          }
          const pickedText = item.dipilih === null || item.dipilih === undefined
            ? 'tidak dijawab'
            : `${String.fromCharCode(65 + item.dipilih)}. ${(soal.opsi || [])[item.dipilih] || ''}`;
          const keyText = `${String.fromCharCode(65 + item.kunci)}. ${(soal.opsi || [])[item.kunci] || ''}`;
          return `<article class="vt-review-item ${item.tepat ? 'vt-correct' : 'vt-wrong'}">
            <div class="vt-review-head">
              <span class="vt-review-no">Soal ${index + 1}</span>
              <span class="badge ${item.tepat ? 'badge-success' : 'badge-danger'}">${item.tepat ? 'Benar' : 'Salah'}</span>
            </div>
            <p class="vt-review-q">${vtEsc(soal.pertanyaan || '')}</p>
            <p class="vt-review-line"><b>Jawaban Anda:</b> ${vtEsc(pickedText)}</p>
            <p class="vt-review-line"><b>Kunci jawaban:</b> ${vtEsc(keyText)}</p>
            ${item.pembahasan ? `<p class="vt-review-line"><b>Pembahasan:</b> ${vtEsc(item.pembahasan)}</p>` : ''}
          </article>`;
        }).join('')}
      </div>`;
    const back = document.getElementById('vt-back');
    if (back) back.addEventListener('click', () => vtRenderList());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function vtTeardown() {
    if (state.tick) { clearInterval(state.tick); state.tick = null; }
    if (state.player && typeof state.player.destroy === 'function') {
      try { state.player.destroy(); } catch (error) { /* pemutar sudah dilepas */ }
    }
    state.player = null;
    state.taskId = null;
    state.task = null;
    state.answers = {};
    state.answered = new Set();
    state.maxWatched = 0;
    state.watched = 0;
    state.lastTime = 0;
    state.questionOpen = false;
    state.submitting = false;
    state.finished = false;
    window.removeEventListener('beforeunload', vtBeforeUnload);
    window.removeEventListener('pagehide', vtPageHide);
  }

  window.vtRenderList = vtRenderList;
  window.vtTeardown = vtTeardown;
  window.vtOpenTask = vtOpenTask;
  window.vtIsSkip = vtIsSkip;
  window.vtSyncProgress = vtSyncProgress;
})();
