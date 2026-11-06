// ===== ADMIN: TUGAS MENGAMATI VIDEO =====
// Editor tugas video + soal bertimestamp. Kunci jawaban dikirim ke server dan tidak
// pernah dibuka ke siswa sebelum jawaban mereka dikumpulkan.
(function () {
  let modalBound = false;
  let resultsState = null;

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  async function vtFetch(path, options = {}) {
    const res = await fetch('/api' + path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Permintaan gagal');
    return data;
  }

  function setStatus(message, kind) {
    const el = document.getElementById('video-task-status');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'vt-admin-status' + (kind ? ` is-${kind}` : '');
  }

  async function renderVideoTasks() {
    const tbody = document.getElementById('video-tasks-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Memuat tugas video…</td></tr>';

    try {
      const [tasks, classes, subjects] = await Promise.all([
        vtFetch('/admin/video-tasks'),
        LMS.getClasses().catch(() => []),
        LMS.getSubjects().catch(() => [])
      ]);
      window.vtAdminClasses = Array.isArray(classes) ? classes : [];
      window.vtAdminSubjects = Array.isArray(subjects) ? subjects : [];
      window.vtAdminTasks = Array.isArray(tasks) ? tasks : [];

      bindToolbar();

      if (!tasks.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--text-2)">Belum ada tugas video. Klik “Buat Tugas Video”.</td></tr>';
        return;
      }

      tbody.innerHTML = tasks.map(task => `
        <tr>
          <td>
            <b>${esc(task.judul)}</b>
            <div class="vt-admin-hint">${task.durasi ? `Durasi ${fmtTime(task.durasi)}` : 'Durasi mengikuti video'} · youtu.be/${esc(task.youtube_id)}</div>
          </td>
          <td>${esc(task.kelas_nama || 'Semua kelas')}</td>
          <td class="vt-strong-num">${esc(task.jumlah_soal)}</td>
          <td class="vt-strong-num">${esc(task.hasil ? task.hasil.students : 0)}</td>
          <td class="vt-strong-num">${task.hasil && task.hasil.average_score !== null ? esc(task.hasil.average_score) : '—'}</td>
          <td><span class="badge ${task.aktif ? 'badge-success' : 'badge-neutral'}">${task.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
          <td class="vt-table-actions">
            ${task.aktif ? `
              <button type="button" class="btn btn-sm" data-vt-preview="${esc(task.id)}">Preview</button>
              <button type="button" class="btn btn-sm" data-vt-share="${esc(task.id)}">Bagikan</button>` : ''}
            <button type="button" class="btn btn-sm" data-vt-edit="${esc(task.id)}">Edit</button>
            <button type="button" class="btn btn-sm" data-vt-result="${esc(task.id)}">Hasil</button>
            <button type="button" class="btn btn-sm btn-danger" data-vt-delete="${esc(task.id)}">Hapus</button>
          </td>
        </tr>`).join('');

      tbody.querySelectorAll('[data-vt-preview]').forEach(button => {
        button.addEventListener('click', () => openPreview(button.dataset.vtPreview));
      });
      tbody.querySelectorAll('[data-vt-share]').forEach(button => {
        button.addEventListener('click', () => shareTask(button.dataset.vtShare));
      });
      tbody.querySelectorAll('[data-vt-edit]').forEach(button => {
        button.addEventListener('click', () => {
          const task = (window.vtAdminTasks || []).find(item => item.id === button.dataset.vtEdit);
          if (task) openEditor(task);
        });
      });
      tbody.querySelectorAll('[data-vt-result]').forEach(button => {
        button.addEventListener('click', () => openResults(button.dataset.vtResult));
      });
      tbody.querySelectorAll('[data-vt-delete]').forEach(button => {
        button.addEventListener('click', () => removeTask(button.dataset.vtDelete));
      });

      if (window.vtPendingPreview) {
        const pending = window.vtPendingPreview;
        window.vtPendingPreview = null;
        openPreview(pending);
      }
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--status-danger)">${esc(error.message)}</td></tr>`;
    }
  }

  function bindToolbar() {
    const form = document.getElementById('video-task-form');
    if (form && form.dataset.bound !== '1') {
      form.dataset.bound = '1';
      form.addEventListener('submit', event => event.preventDefault());
    }

    const addButton = document.getElementById('btn-add-video-task');
    if (addButton && addButton.dataset.bound !== '1') {
      addButton.dataset.bound = '1';
      addButton.addEventListener('click', () => openEditor(null));
    }

    const questionButton = document.getElementById('btn-add-vt-question');
    if (questionButton && questionButton.dataset.bound !== '1') {
      questionButton.dataset.bound = '1';
      questionButton.addEventListener('click', () => addQuestion());
    }

    const saveButton = document.getElementById('btn-save-video-task');
    if (saveButton && saveButton.dataset.bound !== '1') {
      saveButton.dataset.bound = '1';
      saveButton.addEventListener('click', saveTask);
    }

    const shareButton = document.getElementById('btn-share-video-task-modal');
    if (shareButton && shareButton.dataset.bound !== '1') {
      shareButton.dataset.bound = '1';
      shareButton.addEventListener('click', () => {
        if (window.vtPreviewTask) shareTask(window.vtPreviewTask.id);
      });
    }

    if (!modalBound) {
      modalBound = true;
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const modal = document.getElementById('video-task-modal');
        if (modal && modal.classList.contains('show')) {
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);
    }
  }

  function fillSelect(select, items, placeholder, selectedId) {
    if (!select) return;
    const options = [`<option value="">${esc(placeholder)}</option>`];
    (items || []).forEach(item => {
      options.push(`<option value="${esc(item.id)}">${esc(item.nama)}</option>`);
    });
    select.innerHTML = options.join('');
    select.value = selectedId || '';
  }

  function openEditor(task) {
    bindToolbar();
    document.getElementById('video-task-id').value = task ? task.id : '';
    document.getElementById('video-task-modal-title').textContent = task ? 'Edit Tugas Mengamati Video' : 'Buat Tugas Mengamati Video';
    document.getElementById('video-task-judul').value = task ? task.judul : '';
    document.getElementById('video-task-deskripsi').value = task ? (task.deskripsi || '') : '';
    document.getElementById('video-task-youtube').value = task ? task.youtube_id : '';
    document.getElementById('video-task-durasi').value = task && task.durasi ? task.durasi : '';

    fillSelect(document.getElementById('video-task-class'), window.vtAdminClasses, 'Semua kelas', task ? task.class_id : '');
    fillSelect(document.getElementById('video-task-subject'), window.vtAdminSubjects, 'Tanpa mapel', task ? task.subject_id : '');

    const list = document.getElementById('vt-question-list');
    list.innerHTML = '';
    const questions = task && Array.isArray(task.soal) ? task.soal : [];
    if (questions.length) questions.forEach(question => addQuestion(question));
    else addQuestion();

    setStatus('');
    const modal = document.getElementById('video-task-modal');
    if (modal) modal.classList.add('show');
    document.getElementById('video-task-judul').focus();
  }

  function addQuestion(question) {
    const list = document.getElementById('vt-question-list');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'vt-question-item';
    item.innerHTML = `
      <div class="vt-question-head">
        <b>Soal <span data-q-number></span></b>
        <div class="vt-question-head-actions">
          <select data-field="tipe" aria-label="Jenis soal">
            <option value="pg">Pilihan Ganda</option>
            <option value="uraian">Uraian (HOTS)</option>
          </select>
          <button type="button" class="btn btn-sm btn-danger" data-remove-question>Hapus</button>
        </div>
      </div>
      <div class="vt-admin-grid">
        <div class="form-group">
          <label>Muncul pada detik ke-</label>
          <input type="number" min="0" data-field="waktu" placeholder="Contoh: 45">
        </div>
        <div class="form-group">
          <label>Waktu tayang</label>
          <span class="vt-admin-hint" data-time-hint>0:00</span>
        </div>
      </div>
      <div class="form-group">
        <label>Pertanyaan</label>
        <textarea rows="2" data-field="pertanyaan" placeholder="Pertanyaan yang muncul saat video berhenti..."></textarea>
      </div>
      <div data-pg-fields>
        <div class="form-group">
          <label>Pilihan Jawaban (satu per baris, 2–5 pilihan)</label>
          <textarea rows="4" data-field="opsi" placeholder="Pilihan A&#10;Pilihan B&#10;Pilihan C&#10;Pilihan D"></textarea>
        </div>
        <div class="form-group">
          <label>Kunci Jawaban</label>
          <select data-field="kunci">
            <option value="0">A</option><option value="1">B</option>
            <option value="2">C</option><option value="3">D</option><option value="4">E</option>
          </select>
        </div>
      </div>
      <div data-essay-fields class="hidden">
        <div class="form-group">
          <label>Kunci Jawaban Uraian (acuan penilaian)</label>
          <textarea rows="3" data-field="kunci_uraian" placeholder="Tulis jawaban acuan lengkap dan konsep-konsep kuncinya..."></textarea>
        </div>
        <div class="form-group">
          <label>Kata Kunci Penilaian (satu per baris atau pisahkan koma, minimal 2)</label>
          <textarea rows="3" data-field="kata_kunci" placeholder="kanal&#10;gambut kering&#10;musim kemarau"></textarea>
        </div>
        <p class="vt-admin-hint">Nilai uraian dihitung otomatis: 50% kemiripan kalimat dengan kunci acuan + 50% relevansi kata kunci.</p>
      </div>
      <div class="form-group">
        <label>Pembahasan (opsional)</label>
        <input data-field="pembahasan" placeholder="Ditampilkan setelah jawaban dikumpulkan">
      </div>`;
    list.appendChild(item);

    const waktu = item.querySelector('[data-field="waktu"]');
    const hint = item.querySelector('[data-time-hint]');
    const tipeSelect = item.querySelector('[data-field="tipe"]');
    const syncType = () => {
      const essay = tipeSelect.value === 'uraian';
      item.querySelector('[data-pg-fields]').classList.toggle('hidden', essay);
      item.querySelector('[data-essay-fields]').classList.toggle('hidden', !essay);
    };
    tipeSelect.addEventListener('change', syncType);
    const updateHint = () => { hint.textContent = fmtTime(waktu.value); };
    waktu.addEventListener('input', updateHint);

    item.querySelector('[data-remove-question]').addEventListener('click', () => {
      const items = list.querySelectorAll('.vt-question-item');
      if (items.length === 1) {
        setStatus('Minimal satu soal interaktif.', 'error');
        return;
      }
      item.remove();
      renumber();
    });

    waktu.value = question && question.waktu !== undefined ? question.waktu : '';
    tipeSelect.value = question && question.tipe === 'uraian' ? 'uraian' : 'pg';
    item.querySelector('[data-field="pertanyaan"]').value = question ? (question.pertanyaan || '') : '';
    item.querySelector('[data-field="opsi"]').value = question && Array.isArray(question.opsi) ? question.opsi.join('\n') : '';
    item.querySelector('[data-field="kunci"]').value = String(question && question.kunci !== undefined ? question.kunci : 0);
    item.querySelector('[data-field="kunci_uraian"]').value = question ? (question.kunci_uraian || '') : '';
    item.querySelector('[data-field="kata_kunci"]').value = question && Array.isArray(question.kata_kunci)
      ? question.kata_kunci.join('\n')
      : '';
    item.querySelector('[data-field="pembahasan"]').value = question ? (question.pembahasan || '') : '';
    syncType();
    updateHint();
    renumber();
  }

  function renumber() {
    document.querySelectorAll('#vt-question-list .vt-question-item').forEach((item, index) => {
      const label = item.querySelector('[data-q-number]');
      if (label) label.textContent = index + 1;
    });
  }

  function collectQuestions() {
    return Array.from(document.querySelectorAll('#vt-question-list .vt-question-item')).map(item => {
      const tipe = item.querySelector('[data-field="tipe"]').value === 'uraian' ? 'uraian' : 'pg';
      const base = {
        tipe,
        waktu: Math.max(0, Math.round(Number(item.querySelector('[data-field="waktu"]').value) || 0)),
        pertanyaan: item.querySelector('[data-field="pertanyaan"]').value.trim(),
        pembahasan: item.querySelector('[data-field="pembahasan"]').value.trim()
      };
      if (tipe === 'uraian') {
        base.kunci_uraian = item.querySelector('[data-field="kunci_uraian"]').value.trim();
        base.kata_kunci = item.querySelector('[data-field="kata_kunci"]').value
          .split(/[\n,;]+/).map(value => value.trim()).filter(Boolean);
      } else {
        base.opsi = item.querySelector('[data-field="opsi"]').value.split('\n').map(value => value.trim()).filter(Boolean);
        base.kunci = Number(item.querySelector('[data-field="kunci"]').value);
      }
      return base;
    });
  }

  function validateLocally(payload) {
    if (!payload.judul) return 'Judul tugas wajib diisi.';
    if (!payload.youtube_id) return 'Link atau ID video YouTube wajib diisi.';
    if (!payload.soal.length) return 'Tambahkan minimal satu soal.';
    for (let index = 0; index < payload.soal.length; index++) {
      const question = payload.soal[index];
      const nomor = index + 1;
      if (!question.pertanyaan) return `Pertanyaan soal #${nomor} wajib diisi.`;
      if (question.tipe === 'uraian') {
        if (!question.kunci_uraian || question.kunci_uraian.length < 20) {
          return `Kunci uraian soal #${nomor} minimal 20 karakter.`;
        }
        if (!question.kata_kunci || question.kata_kunci.length < 2) {
          return `Soal uraian #${nomor} butuh minimal 2 kata kunci penilaian.`;
        }
      } else {
        if (question.opsi.length < 2 || question.opsi.length > 5) return `Soal #${nomor} butuh 2–5 pilihan jawaban.`;
        if (question.kunci < 0 || question.kunci >= question.opsi.length) return `Kunci jawaban soal #${nomor} tidak sesuai jumlah pilihan.`;
      }
      if (payload.durasi && question.waktu > payload.durasi) return `Waktu soal #${nomor} melebihi durasi video.`;
    }
    return '';
  }

  async function saveTask() {
    const id = document.getElementById('video-task-id').value;
    const payload = {
      judul: document.getElementById('video-task-judul').value.trim(),
      deskripsi: document.getElementById('video-task-deskripsi').value.trim(),
      youtube_id: document.getElementById('video-task-youtube').value.trim(),
      durasi: Math.max(0, Math.round(Number(document.getElementById('video-task-durasi').value) || 0)),
      class_id: document.getElementById('video-task-class').value || null,
      subject_id: document.getElementById('video-task-subject').value || null,
      soal: collectQuestions()
    };

    const problem = validateLocally(payload);
    if (problem) { setStatus(problem, 'error'); return; }

    const button = document.getElementById('btn-save-video-task');
    button.disabled = true;
    setStatus('Menyimpan…');
    try {
      if (id) await vtFetch(`/admin/video-tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await vtFetch('/admin/video-tasks', { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('video-task-modal').classList.remove('show');
      await renderVideoTasks();
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function removeTask(id) {
    const task = (window.vtAdminTasks || []).find(item => item.id === id);
    if (!window.confirm(`Hapus tugas video “${task ? task.judul : ''}” beserta seluruh nilainya?`)) return;
    try {
      await vtFetch(`/admin/video-tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await renderVideoTasks();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function openResults(id) {
    const body = document.getElementById('video-task-result-body');
    const modal = document.getElementById('video-task-result-modal');
    if (!body || !modal) return;
    body.innerHTML = '<p>Memuat hasil…</p>';
    modal.classList.add('show');
    try {
      const data = await vtFetch(`/admin/video-tasks/${encodeURIComponent(id)}/hasil`);
      document.getElementById('video-task-result-title').textContent = `Rekap: ${data.task.judul}`;
      const students = Array.isArray(data.students) ? data.students : [];
      const classes = Array.isArray(data.classes) ? data.classes : [];
      resultsState = { data, students, classes, filtered: [] };

      body.innerHTML = `
        <div class="vt-result-summary" id="vt-result-summary"></div>
        <div class="vt-result-filters">
          <label>Kelas
            <select id="vt-filter-kelas">
              <option value="">Semua kelas</option>
              ${classes.map(item => `<option value="${esc(item.id)}">${esc(item.nama)}</option>`).join('')}
            </select>
          </label>
          <label>Status mengerjakan
            <select id="vt-filter-status">
              <option value="">Semua status</option>
              <option value="sudah">Sudah mengerjakan</option>
              <option value="menonton">Sedang menonton</option>
              <option value="belum">Belum mengerjakan</option>
            </select>
          </label>
          <label>Nilai
            <select id="vt-filter-nilai">
              <option value="">Semua nilai</option>
              <option value="tuntas">Tuntas (≥ 75)</option>
              <option value="belum_tuntas">Belum tuntas (&lt; 75)</option>
              <option value="tanpa">Tanpa nilai</option>
            </select>
          </label>
          <button type="button" class="btn btn-sm" id="btn-print-result">🖨 Cetak Laporan</button>
        </div>
        <div id="vt-result-list"></div>`;

      ['kelas', 'status', 'nilai'].forEach(key => {
        document.getElementById(`vt-filter-${key}`).addEventListener('change', renderResultTable);
      });
      document.getElementById('btn-print-result').addEventListener('click', printResultReport);
      renderResultTable();
    } catch (error) {
      body.innerHTML = `<p style="color:var(--status-danger)">${esc(error.message)}</p>`;
    }
  }

  function statusBadgeClass(status) {
    if (status === 'sudah') return 'badge-success';
    if (status === 'menonton') return 'badge-warning';
    return 'badge-neutral';
  }

  function statusText(status) {
    if (status === 'sudah') return 'Sudah';
    if (status === 'menonton') return 'Sedang menonton';
    return 'Belum';
  }

  function watchPercentOf(student) {
    const value = Number(student.watch_percent);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
  }

  function renderResultTable() {
    const state = resultsState;
    const list = document.getElementById('vt-result-list');
    const summary = document.getElementById('vt-result-summary');
    if (!state || !list || !summary) return;

    const kelas = document.getElementById('vt-filter-kelas')?.value || '';
    const status = document.getElementById('vt-filter-status')?.value || '';
    const nilai = document.getElementById('vt-filter-nilai')?.value || '';

    const rows = state.students.filter(student => {
      if (kelas && student.class_id !== kelas) return false;
      if (status && student.status !== status) return false;
      if (nilai === 'tuntas' && !(student.best_score !== null && student.best_score >= 75)) return false;
      if (nilai === 'belum_tuntas' && !(student.best_score !== null && student.best_score < 75)) return false;
      if (nilai === 'tanpa' && student.best_score !== null) return false;
      return true;
    });
    state.filtered = rows;

    const done = state.students.filter(student => student.status === 'sudah');
    const watching = state.students.filter(student => student.status === 'menonton');
    const scores = done.map(student => Number(student.best_score) || 0);
    const average = scores.length
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
      : null;
    summary.innerHTML = `
      <div class="vt-stat"><span>Total siswa</span><b>${state.students.length}</b></div>
      <div class="vt-stat"><span>Sudah mengerjakan</span><b>${done.length}</b></div>
      <div class="vt-stat"><span>Sedang menonton</span><b>${watching.length}</b></div>
      <div class="vt-stat"><span>Belum mengerjakan</span><b>${state.students.length - done.length - watching.length}</b></div>
      <div class="vt-stat"><span>Rata-rata nilai terbaik</span><b>${average === null ? '—' : average}</b></div>
      <div class="vt-stat"><span>Ditampilkan</span><b>${rows.length}</b></div>`;

    if (!rows.length) {
      list.innerHTML = '<p class="vt-admin-hint">Tidak ada siswa yang cocok dengan filter.</p>';
      return;
    }
    list.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>No</th><th>Nama Siswa</th><th>NIS</th><th>Kelas</th><th>Status</th><th>Progres Tonton</th><th>Percobaan</th><th>Nilai Terbaik</th><th>Nilai Terakhir</th><th>Terakhir</th></tr></thead>
          <tbody>
            ${rows.map((student, index) => {
              const pct = watchPercentOf(student);
              return `
              <tr>
                <td>${index + 1}</td>
                <td>${esc(student.nama)}</td>
                <td>${esc(student.nis || '-')}</td>
                <td>${esc(student.class_nama || '-')}</td>
                <td><span class="badge ${statusBadgeClass(student.status)}">${statusText(student.status)}</span></td>
                <td class="vt-progress-cell">
                  <span class="vt-progress"><i style="width:${pct}%"></i></span>
                  <small>${pct}%</small>
                </td>
                <td class="vt-strong-num">${esc(student.attempts)}</td>
                <td class="vt-strong-num">${student.best_score === null ? '—' : esc(student.best_score)}</td>
                <td class="vt-strong-num">${student.last_score === null ? '—' : esc(student.last_score)}</td>
                <td>${student.last_at ? esc(new Date(student.last_at).toLocaleString('id-ID')) : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function printResultReport() {
    const state = resultsState;
    const area = document.getElementById('vt-print-area');
    if (!state || !area) return;
    const kelasId = document.getElementById('vt-filter-kelas')?.value || '';
    const kelasLabel = kelasId
      ? (state.classes.find(item => item.id === kelasId)?.nama || '')
      : 'Semua kelas';
    const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    const rows = state.filtered || [];
    area.innerHTML = `
      <div class="vt-print-head">
        <h1>Laporan Tugas Mengamati Video</h1>
        <p><b>${esc(state.data.task.judul)}</b></p>
        <p>Video: https://youtu.be/${esc(state.data.task.youtube_id)} · Kelas: ${esc(kelasLabel)} · Dicetak: ${esc(printedAt)}</p>
      </div>
      <table class="vt-print-table">
        <thead><tr><th>No</th><th>Nama Siswa</th><th>NIS</th><th>Kelas</th><th>Status</th><th>Progres Tonton</th><th>Percobaan</th><th>Nilai Terbaik</th><th>Nilai Terakhir</th><th>Terakhir</th></tr></thead>
        <tbody>
          ${rows.map((student, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${esc(student.nama)}</td>
              <td>${esc(student.nis || '-')}</td>
              <td>${esc(student.class_nama || '-')}</td>
              <td>${statusText(student.status)}</td>
              <td>${watchPercentOf(student)}%</td>
              <td>${esc(student.attempts)}</td>
              <td>${student.best_score === null ? '-' : esc(student.best_score)}</td>
              <td>${student.last_score === null ? '-' : esc(student.last_score)}</td>
              <td>${student.last_at ? esc(new Date(student.last_at).toLocaleString('id-ID')) : '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="vt-print-foot">Jumlah siswa: ${rows.length} · Sudah mengerjakan: ${rows.filter(s => s.status === 'sudah').length} · Sedang menonton: ${rows.filter(s => s.status === 'menonton').length} · Belum mengerjakan: ${rows.filter(s => s.status === 'belum').length}</p>`;
    document.body.classList.add('vt-printing');
    const bersihkan = () => document.body.classList.remove('vt-printing');
    window.addEventListener('afterprint', bersihkan, { once: true });
    window.print();
    setTimeout(bersihkan, 1500);
  }

  function taskShareLink(task) {
    return `${window.location.origin}/student.html?task=${encodeURIComponent(task.id)}`;
  }

  function showToast(message) {
    let toast = document.getElementById('vt-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'vt-toast';
      toast.className = 'vt-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  async function shareTask(id) {
    const task = (window.vtAdminTasks || []).find(item => item.id === id)
      || (window.vtPreviewTask && window.vtPreviewTask.id === id ? window.vtPreviewTask : null);
    if (!task) return;
    const link = taskShareLink(task);
    const text = `Tugas Video: ${task.judul}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: task.judul, text, url: link });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      showToast('Link tugas disalin. Tempel ke WhatsApp atau grup kelas.');
    } catch (error) {
      window.prompt('Salin tautan tugas:', link);
    }
  }

  function openPreview(id) {
    const task = (window.vtAdminTasks || []).find(item => item.id === id);
    const body = document.getElementById('video-task-preview-body');
    const modal = document.getElementById('video-task-preview-modal');
    if (!task || !body || !modal) return;

    window.vtPreviewTask = task;
    document.getElementById('video-task-preview-title').textContent = `Preview: ${task.judul}`;
    body.innerHTML = `
      <div class="vt-preview-stage">
        <iframe src="https://www.youtube.com/embed/${encodeURIComponent(task.youtube_id)}?rel=0"
          title="${esc(task.judul)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      </div>
      <div class="vt-preview-meta">
        <span class="badge badge-success">Aktif</span>
        <span>${esc(task.jumlah_soal)} soal</span>
        <span>${task.durasi ? `Durasi ${fmtTime(task.durasi)}` : 'Durasi mengikuti video'}</span>
        <span>Kelas: ${esc(task.kelas_nama || 'Semua kelas')}</span>
        <span>KKM 75</span>
      </div>
      <p class="vt-admin-hint">Soal muncul otomatis pada detik berikut dan video berhenti sampai siswa menjawab. Kunci jawaban hanya terlihat di pratinjau ini.</p>
      <ol class="vt-preview-list">
        ${(task.soal || []).map((item, index) => {
          const isEssay = item.tipe === 'uraian';
          const answerBlock = isEssay
            ? `<div class="vt-preview-essay">
                 <p class="vt-review-line"><b>Kunci acuan:</b> ${esc(item.kunci_uraian || '')}</p>
                 <p class="vt-admin-hint"><b>Kata kunci penilaian:</b> ${esc((item.kata_kunci || []).join(', '))}</p>
               </div>`
            : `<ul class="vt-preview-options">
                 ${(item.opsi || []).map((opsi, i) => `<li class="${i === item.kunci ? 'vt-key' : ''}"><span>${String.fromCharCode(65 + i)}</span>${esc(opsi)}</li>`).join('')}
               </ul>`;
          return `<li>
            <div class="vt-preview-qhead">
              <span class="vt-time">${fmtTime(item.waktu)}</span>
              <b>Soal ${index + 1}${isEssay ? ' · Uraian' : ''}</b>
            </div>
            <p class="vt-preview-question">${esc(item.pertanyaan)}</p>
            ${answerBlock}
            ${item.pembahasan ? `<p class="vt-admin-hint"><b>Pembahasan:</b> ${esc(item.pembahasan)}</p>` : ''}
          </li>`;
        }).join('')}
      </ol>`;
    modal.classList.add('show');
  }

  window.renderVideoTasks = renderVideoTasks;
  window.vtPreviewTask = null;

  // Tautan admin.html?preview=<id> membuka pratinjau tugas langsung.
  document.addEventListener('DOMContentLoaded', () => {
    const previewId = new URLSearchParams(window.location.search).get('preview');
    if (!previewId) return;
    window.vtPendingPreview = previewId;
    try { history.replaceState(null, '', window.location.pathname); } catch (error) { /* abaikan */ }
    if (typeof switchMenu === 'function') switchMenu('video-tasks');
  });
})();
