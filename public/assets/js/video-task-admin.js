// ===== ADMIN: TUGAS MENGAMATI VIDEO =====
// Editor tugas video + soal bertimestamp. Kunci jawaban dikirim ke server dan tidak
// pernah dibuka ke siswa sebelum jawaban mereka dikumpulkan.
(function () {
  let modalBound = false;

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
            <button type="button" class="btn btn-sm" data-vt-edit="${esc(task.id)}">Edit</button>
            <button type="button" class="btn btn-sm" data-vt-result="${esc(task.id)}">Hasil</button>
            <button type="button" class="btn btn-sm btn-danger" data-vt-delete="${esc(task.id)}">Hapus</button>
          </td>
        </tr>`).join('');

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
        <button type="button" class="btn btn-sm btn-danger" data-remove-question>Hapus</button>
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
      <div class="form-group">
        <label>Pilihan Jawaban (satu per baris, 2–5 pilihan)</label>
        <textarea rows="4" data-field="opsi" placeholder="Pilihan A&#10;Pilihan B&#10;Pilihan C&#10;Pilihan D"></textarea>
      </div>
      <div class="vt-admin-grid">
        <div class="form-group">
          <label>Kunci Jawaban</label>
          <select data-field="kunci">
            <option value="0">A</option><option value="1">B</option>
            <option value="2">C</option><option value="3">D</option><option value="4">E</option>
          </select>
        </div>
        <div class="form-group">
          <label>Pembahasan (opsional)</label>
          <input data-field="pembahasan" placeholder="Ditampilkan setelah jawaban dikumpulkan">
        </div>
      </div>`;
    list.appendChild(item);

    const waktu = item.querySelector('[data-field="waktu"]');
    const hint = item.querySelector('[data-time-hint]');
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
    item.querySelector('[data-field="pertanyaan"]').value = question ? (question.pertanyaan || '') : '';
    item.querySelector('[data-field="opsi"]').value = question && Array.isArray(question.opsi) ? question.opsi.join('\n') : '';
    item.querySelector('[data-field="kunci"]').value = String(question && question.kunci !== undefined ? question.kunci : 0);
    item.querySelector('[data-field="pembahasan"]').value = question ? (question.pembahasan || '') : '';
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
    return Array.from(document.querySelectorAll('#vt-question-list .vt-question-item')).map(item => ({
      waktu: Math.max(0, Math.round(Number(item.querySelector('[data-field="waktu"]').value) || 0)),
      pertanyaan: item.querySelector('[data-field="pertanyaan"]').value.trim(),
      opsi: item.querySelector('[data-field="opsi"]').value.split('\n').map(value => value.trim()).filter(Boolean),
      kunci: Number(item.querySelector('[data-field="kunci"]').value),
      pembahasan: item.querySelector('[data-field="pembahasan"]').value.trim()
    }));
  }

  function validateLocally(payload) {
    if (!payload.judul) return 'Judul tugas wajib diisi.';
    if (!payload.youtube_id) return 'Link atau ID video YouTube wajib diisi.';
    if (!payload.soal.length) return 'Tambahkan minimal satu soal.';
    for (let index = 0; index < payload.soal.length; index++) {
      const question = payload.soal[index];
      const nomor = index + 1;
      if (!question.pertanyaan) return `Pertanyaan soal #${nomor} wajib diisi.`;
      if (question.opsi.length < 2 || question.opsi.length > 5) return `Soal #${nomor} butuh 2–5 pilihan jawaban.`;
      if (question.kunci < 0 || question.kunci >= question.opsi.length) return `Kunci jawaban soal #${nomor} tidak sesuai jumlah pilihan.`;
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
      document.getElementById('video-task-result-title').textContent = `Hasil: ${data.task.judul}`;
      const attempts = Array.isArray(data.attempts) ? data.attempts : [];

      if (!attempts.length) {
        body.innerHTML = '<p>Belum ada siswa yang mengumpulkan tugas ini.</p>';
        return;
      }

      const bestByStudent = new Map();
      const countByStudent = new Map();
      attempts.forEach(attempt => {
        countByStudent.set(attempt.student_id, (countByStudent.get(attempt.student_id) || 0) + 1);
        const current = bestByStudent.get(attempt.student_id);
        if (!current || Number(attempt.score) > Number(current.score)) bestByStudent.set(attempt.student_id, attempt);
      });
      const bestRows = Array.from(bestByStudent.values())
        .sort((a, b) => Number(b.score) - Number(a.score));

      body.innerHTML = `
        <div class="vt-admin-grid">
          <div><b>Total percobaan</b><p>${attempts.length}</p></div>
          <div><b>Jumlah siswa</b><p>${bestByStudent.size}</p></div>
        </div>
        <h4 class="vt-result-table">Rekap nilai terbaik</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nama Siswa</th><th>NIS</th><th>Nilai</th><th>Percobaan</th><th>Terakhir</th></tr></thead>
            <tbody>
              ${bestRows.map(attempt => `
                <tr>
                  <td>${esc(attempt.student_nama)}</td>
                  <td>${esc(attempt.student_nis || '-')}</td>
                  <td class="vt-strong-num">${esc(attempt.score)}</td>
                  <td class="vt-strong-num">${esc(countByStudent.get(attempt.student_id))}</td>
                  <td>${attempt.created_at ? esc(new Date(attempt.created_at).toLocaleString('id-ID')) : '-'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <h4 class="vt-result-table">Riwayat percobaan</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nama Siswa</th><th>Percobaan</th><th>Benar</th><th>Nilai</th><th>Durasi tonton</th><th>Waktu kirim</th></tr></thead>
            <tbody>
              ${attempts.map(attempt => `
                <tr>
                  <td>${esc(attempt.student_nama)}</td>
                  <td>ke-${esc(attempt.ke)}</td>
                  <td class="vt-strong-num">${esc(attempt.benar)}/${esc(attempt.total)}</td>
                  <td class="vt-strong-num">${esc(attempt.score)}</td>
                  <td>${fmtTime(attempt.watched_seconds)}</td>
                  <td>${attempt.created_at ? esc(new Date(attempt.created_at).toLocaleString('id-ID')) : '-'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      body.innerHTML = `<p style="color:var(--status-danger)">${esc(error.message)}</p>`;
    }
  }

  window.renderVideoTasks = renderVideoTasks;
})();
