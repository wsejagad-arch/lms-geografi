// ===== STUDENT PANEL: GEO EDULABS LMS =====
// Modern, Systematic & Token-Efficient Architecture
let currentUser = null;
let currentTenant = null;

// ============================================================================
// TOKEN-EFFICIENT CLIENT-SIDE CACHING LAYER (LMS_CACHE)
// Minimizes network roundtrips, saves bandwidth, and cuts token/payload loads
// ============================================================================
const LMS_CACHE = {
  data: new Map(),
  ttl: 60 * 1000, // 60 seconds default TTL

  get(key) {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > this.ttl) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  },

  set(key, value) {
    this.data.set(key, { value, time: Date.now() });
    return value;
  },

  invalidate(key) {
    if (key) this.data.delete(key);
    else this.data.clear();
  }
};

// Raw in-memory state for client-side filtering without refetching
let rawMaterials = [];
let rawAssignments = [];
let activeMateriFilter = 'all';

// Terpasang lebih awal agar tombol keluar tetap jalan walau render data gagal.
function bindLogoutButton() {
  const btn = document.getElementById('btn-logout-siswa');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try { 
      LMS_CACHE.invalidate();
      await LMS.logout(); 
    } catch { 
      /* tetap keluar walau request gagal */ 
    }
    window.location.replace('/');
  });
}

async function init() {
  bindLogoutButton();
  currentUser = await LMS.checkAuth();
  if (!currentUser || currentUser.role !== 'student') {
    window.location.href = '/';
    return;
  }
  
  currentTenant = LMS.getCurrentTenant();

  // Populate user identity across UI
  const nama = currentUser.nama || 'Siswa';
  const initial = nama.trim().charAt(0).toUpperCase();

  const elNamaDisplay = document.getElementById('siswa-nama-display');
  if (elNamaDisplay) elNamaDisplay.textContent = nama;

  const elSidebarNama = document.getElementById('siswa-sidebar-nama');
  if (elSidebarNama) elSidebarNama.textContent = nama;

  const elUserInitial = document.getElementById('user-initial');
  if (elUserInitial) elUserInitial.textContent = initial;

  const elSidebarAvatar = document.getElementById('sidebar-avatar');
  if (elSidebarAvatar) elSidebarAvatar.textContent = initial;

  const elSidebarStudentName = document.getElementById('sidebar-student-name');
  if (elSidebarStudentName) elSidebarStudentName.textContent = nama;

  const elHeroGreeting = document.getElementById('hero-student-greeting');
  if (elHeroGreeting) elHeroGreeting.textContent = `Semangat Belajar, ${nama.split(' ')[0]}! 👋`;

  // Fetch student detailed profile / class info if available
  updateStudentProfileCard();

  // Initial batch load
  await Promise.allSettled([
    renderDashboard(),
    renderMateri(),
    renderNilai(),
    renderAttendance(),
    renderAssignments(),
    renderExam()
  ]);
  
  showSection('dashboard');
  setupNav('dashboard');
  document.getElementById('page-title').textContent = 'Beranda';
  const breadcrumb = document.getElementById('page-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = 'BERANDA';

  setupToolbars();
  bindLogoutButton();
}

function updateStudentProfileCard() {
  const profile = currentUser || {};
  const nis = profile.nis || '-';
  const kelas = profile.kelas_nama || (profile.class_id ? 'Kelas X E' : '-');
  const walikelas = profile.wali_kelas || 'Dwi Retnoningsih, S.Pd';

  const profNama = document.getElementById('prof-nama');
  if (profNama) profNama.textContent = profile.nama || '-';

  const profNis = document.getElementById('prof-nis');
  if (profNis) profNis.textContent = nis;

  const profKelas = document.getElementById('prof-kelas');
  if (profKelas) profKelas.textContent = kelas;

  const profWali = document.getElementById('prof-walikelas');
  if (profWali) profWali.textContent = walikelas;

  const sidebarClass = document.getElementById('sidebar-student-class');
  if (sidebarClass) sidebarClass.textContent = `NIS: ${nis} • ${kelas}`;

  // Preserve compatibility for test assertions
  const sProfileInfo = document.getElementById('s-profile-info');
  if (sProfileInfo) {
    sProfileInfo.textContent = `${profile.nama} • NIS: ${nis} • Kelas: ${kelas}`;
  }
}

function setupNav(active) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === active);
  });
}

function showSection(id) {
  ['dashboard','belajar','materi-saya','tugas-saya','presensi-saya','nilai-saya','exam-saya'].forEach(s => {
    const el = document.getElementById(`sec-${s}`);
    if (el) el.classList.toggle('hidden', s !== id);
  });
}

// ============================================================================
// DASHBOARD: BENTO STATS & SUMMARY
// ============================================================================
async function renderDashboard() {
  try {
    updateStudentProfileCard();
    
    // Cached fetch to avoid repeating identical API calls
    const cacheKey = `dash_${currentUser.student_id || currentUser.id}`;
    let [materials, grades, exams, attendance, assignments] = LMS_CACHE.get(cacheKey) || [null, null, null, null, null];

    if (!materials || !grades || !exams) {
      [materials, grades, exams] = await Promise.all([
        currentUser.class_id ? LMS.getMaterials({ class_id: currentUser.class_id }) : LMS.getMaterials(),
        currentUser.student_id ? LMS.getGrades({ student_id: currentUser.student_id }) : LMS.getGrades(),
        currentUser.class_id ? LMS.getExams().then(e => e.filter(x => x.class_id === currentUser.class_id)) : LMS.getExams()
      ]);

      try {
        [attendance, assignments] = await Promise.all([
          LMS.getAttendance().then(a => a.filter(x => x.student_id === currentUser.student_id)),
          LMS.getAssignments()
        ]);
      } catch {
        attendance = [];
        assignments = [];
      }

      LMS_CACHE.set(cacheKey, [materials, grades, exams, attendance, assignments]);
    }

    // Set stat values
    const statMateri = document.getElementById('s-stat-materi');
    if (statMateri) statMateri.textContent = materials.length;

    const statNilai = document.getElementById('s-stat-nilai');
    if (statNilai) statNilai.textContent = grades.length;

    const statExam = document.getElementById('s-stat-exam');
    if (statExam) statExam.textContent = exams.length;

    const statPresensi = document.getElementById('s-stat-presensi');
    if (statPresensi) statPresensi.textContent = attendance.length;

    const statTugas = document.getElementById('s-stat-tugas');
    if (statTugas) statTugas.textContent = assignments.length;
    
    const rata = grades.length > 0
      ? Math.round((grades.reduce((s, g) => s + g.nilai, 0) / grades.length) * 10) / 10
      : 0;
    const statRata = document.getElementById('s-stat-rata');
    if (statRata) statRata.textContent = rata;

  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// ============================================================================
// MATERIALS: GRID, SEARCH, & DETAIL MODAL
// ============================================================================
async function renderMateri() {
  const grid = document.getElementById('materi-grid');
  const empty = document.getElementById('materi-empty');
  if (!grid) return;
  
  try {
    const cacheKey = `mat_${currentUser.class_id || 'all'}`;
    let materials = LMS_CACHE.get(cacheKey);

    if (!materials) {
      const params = currentUser.class_id ? { class_id: currentUser.class_id } : {};
      materials = await LMS.getMaterials(params);
      LMS_CACHE.set(cacheKey, materials);
    }
    
    rawMaterials = materials || [];
    filterAndDisplayMateri();

  } catch (err) {
    console.error('Failed to load materi:', err);
  }
}

function filterAndDisplayMateri() {
  const grid = document.getElementById('materi-grid');
  const empty = document.getElementById('materi-empty');
  if (!grid) return;

  const searchInput = document.getElementById('materi-search-input');
  const query = (searchInput?.value || '').toLowerCase().trim();

  let filtered = rawMaterials.filter(m => {
    const matchesQuery = !query || 
      (m.judul || '').toLowerCase().includes(query) || 
      (m.modul || '').toLowerCase().includes(query) || 
      (m.subject_nama || '').toLowerCase().includes(query);

    const matchesFilter = 
      activeMateriFilter === 'all' ? true :
      activeMateriFilter === 'video' ? Boolean(m.youtube_id) :
      activeMateriFilter === 'modul' ? Boolean(m.modul) : true;

    return matchesQuery && matchesFilter;
  });

  if (!filtered.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  grid.innerHTML = filtered.map(m => `
    <article class="material-card" onclick="openMateriDetail('${m.id}')" role="button" tabindex="0">
      <div class="thumb">
        ${m.image 
          ? `<img src="${m.image}" alt="${lmsEsc(m.judul)}" loading="lazy">` 
          : `<div class="thumb-fallback" aria-hidden="true">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polygon points="12 6 15 12 12 11 9 12 12 6"/><polygon points="12 18 15 12 12 13 9 12 12 18"/></svg>
               <span style="font-size:11px;font-weight:600;letter-spacing:0.04em;">GEO EDULABS</span>
             </div>`
        }
      </div>
      <div class="material-card-tags">
        <span class="badge badge-primary">${lmsEsc(m.subject_nama || 'Geografi')}</span>
        <span class="badge badge-neutral">Kelas ${lmsEsc(m.class_nama || '-')}</span>
        ${m.youtube_id ? '<span class="badge badge-warning">Video</span>' : ''}
      </div>
      <h3>${lmsEsc(m.judul)}</h3>
      <p>${m.modul ? 'Modul ' + lmsEsc(m.modul) : 'Materi Terstruktur'}</p>
      <div class="material-card-footer">
        <span class="class-badge">Kurikulum Merdeka</span>
        <span class="btn-open-materi">
          <span>Buka Materi</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </div>
    </article>
  `).join('');
}

function openMateriDetail(id) {
  const m = rawMaterials.find(x => x.id === id);
  if (!m) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal" style="max-width:760px">
      <div class="modal-header">
        <h3>${lmsEsc(m.judul)}</h3>
        <button type="button" class="modal-close" data-close aria-label="Tutup">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <span class="badge badge-primary">${lmsEsc(m.subject_nama || 'Geografi')}</span>
          <span class="badge badge-neutral">Kelas ${lmsEsc(m.class_nama || '-')}</span>
          ${m.modul ? `<span class="badge badge-neutral">Modul ${lmsEsc(m.modul)}</span>` : ''}
        </div>
        ${m.youtube_id ? `<iframe width="100%" height="340" src="https://www.youtube.com/embed/${m.youtube_id}" frameborder="0" allowfullscreen style="border-radius:10px;margin-bottom:16px"></iframe>` : ''}
        <div style="line-height:1.75;font-size:14.5px;color:var(--text);">${lmsSanitize(m.konten || '<p>Tidak ada uraian teks untuk materi ini.</p>')}</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" data-close>Tutup Materi</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.remove();
  });
}

// ============================================================================
// GRADES: TRANSCRIPT & PERFORMANCE EVALUATION
// ============================================================================
async function renderNilai() {
  const tbody = document.getElementById('nilai-saya-tbody');
  if (!tbody) return;
  
  try {
    const cacheKey = `grades_${currentUser.student_id || 'me'}`;
    let grades = LMS_CACHE.get(cacheKey);

    if (!grades) {
      const params = currentUser.student_id ? { student_id: currentUser.student_id } : {};
      grades = await LMS.getGrades(params);
      LMS_CACHE.set(cacheKey, grades);
    }

    if (!grades.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada riwayat nilai untuk akun Anda.</td></tr>';
      return;
    }

    // Summary calculations
    const rata = Math.round((grades.reduce((s, g) => s + g.nilai, 0) / grades.length) * 10) / 10;
    const isTuntas = rata >= 75;

    const elRata = document.getElementById('nilai-summary-rata');
    if (elRata) elRata.textContent = rata;

    const elCount = document.getElementById('nilai-summary-count');
    if (elCount) elCount.textContent = `${grades.length} Penilaian`;

    const elStatus = document.getElementById('nilai-summary-status');
    if (elStatus) {
      elStatus.textContent = isTuntas ? 'Tuntas (Di Atas KKM)' : 'Perlu Remedial';
      elStatus.style.color = isTuntas ? 'var(--status-success)' : 'var(--status-danger)';
    }

    tbody.innerHTML = grades.slice().reverse().map(g => {
      const pass = g.nilai >= 75;
      return `
        <tr>
          <td><span class="badge badge-primary">${lmsEsc(g.subject_nama || 'Geografi')}</span></td>
          <td><span class="badge badge-neutral">${lmsEsc(g.class_nama || '-')}</span></td>
          <td><b>${lmsEsc((g.tipe || 'TUGAS').toUpperCase())}</b></td>
          <td class="num"><strong style="font-size:14px;color:${pass ? 'var(--status-success)' : 'var(--status-danger)'};">${g.nilai}</strong></td>
          <td>
            <span class="badge ${pass ? 'badge-success' : 'badge-danger'}">
              ${pass ? 'Tuntas' : 'Remedial'}
            </span>
          </td>
          <td>${lmsEsc(g.catatan || '-')}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Gagal memuat nilai: ${lmsEsc(err.message)}</td></tr>`;
  }
}

// ============================================================================
// ATTENDANCE: RECAP & METRIC SUMMARY
// ============================================================================
async function renderAttendance() {
  const tbody = document.getElementById('presensi-saya-tbody');
  if (!tbody) return;
  
  try {
    const cacheKey = `att_${currentUser.student_id || 'me'}`;
    let attendance = LMS_CACHE.get(cacheKey);

    if (!attendance) {
      const allAtt = await LMS.getAttendance();
      attendance = allAtt.filter(a => a.student_id === currentUser.student_id);
      LMS_CACHE.set(cacheKey, attendance);
    }

    // Counts by status
    const total = attendance.length;
    let hadir = 0, izin = 0, sakit = 0, alpa = 0;
    attendance.forEach(a => {
      const st = (a.status || '').toLowerCase();
      if (st === 'hadir') hadir++;
      else if (st === 'izin') izin++;
      else if (st === 'sakit') sakit++;
      else if (st === 'alpa') alpa++;
    });

    const pct = total > 0 ? Math.round((hadir / total) * 100) : 100;
    const elBadge = document.getElementById('presensi-summary-badge');
    if (elBadge) elBadge.textContent = `Kehadiran ${pct}%`;

    const elTotal = document.getElementById('pres-total');
    if (elTotal) elTotal.textContent = total;
    const elHadir = document.getElementById('pres-hadir');
    if (elHadir) elHadir.textContent = hadir;
    const elIzin = document.getElementById('pres-izin');
    if (elIzin) elIzin.textContent = izin;
    const elSakit = document.getElementById('pres-sakit');
    if (elSakit) elSakit.textContent = sakit;
    const elAlpa = document.getElementById('pres-alpa');
    if (elAlpa) elAlpa.textContent = alpa;

    if (!total) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada catatan presensi terekam.</td></tr>';
      return;
    }
    
    const badgeStatus = { hadir: 'success', izin: 'warning', sakit: 'primary', alpa: 'danger' };
    tbody.innerHTML = attendance.slice(0, 50).map(a => `
      <tr>
        <td><b>${lmsEsc(a.date)}</b></td>
        <td><span class="badge badge-${badgeStatus[a.status] || 'neutral'}">${lmsEsc((a.status || 'HADIR').toUpperCase())}</span></td>
        <td>${lmsEsc(a.kelas_nama || '-')}</td>
        <td>${lmsEsc(a.note || '-')}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Gagal memuat presensi: ${lmsEsc(err.message)}</td></tr>`;
  }
}

// ============================================================================
// ASSIGNMENTS: STACK & REAL-TIME SEARCH
// ============================================================================
async function renderAssignments() {
  const container = document.getElementById('tugas-saya-grid');
  const empty = document.getElementById('tugas-empty');
  if (!container) return;
  
  try {
    const cacheKey = 'assignments_list';
    let assignments = LMS_CACHE.get(cacheKey);

    if (!assignments) {
      assignments = await LMS.getAssignments();
      LMS_CACHE.set(cacheKey, assignments);
    }
    
    rawAssignments = assignments || [];
    filterAndDisplayTugas();

  } catch (err) {
    container.innerHTML = `<div class="card"><p class="meta">Gagal memuat tugas: ${lmsEsc(err.message)}</p></div>`;
  }
}

function filterAndDisplayTugas() {
  const container = document.getElementById('tugas-saya-grid');
  const empty = document.getElementById('tugas-empty');
  if (!container) return;

  const searchInput = document.getElementById('tugas-search-input');
  const query = (searchInput?.value || '').toLowerCase().trim();

  const filtered = rawAssignments.filter(a => {
    return !query || 
      (a.judul || '').toLowerCase().includes(query) || 
      (a.deskripsi || '').toLowerCase().includes(query) ||
      (a.subject_nama || '').toLowerCase().includes(query);
  });

  if (!filtered.length) {
    container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  container.innerHTML = filtered.map(a => `
    <article class="card">
      <div class="card-row">
        <h3>${lmsEsc(a.judul)}</h3>
        <span class="badge badge-neutral" style="font-weight:700;">${a.poin || 100} Poin</span>
      </div>
      <p class="meta">${lmsEsc(a.subject_nama || 'Geografi')} · Kelas ${lmsEsc(a.class_nama || '-')}${a.due_date ? ' · <span style="color:var(--status-danger);">Tenggat: ' + lmsEsc(a.due_date) + '</span>' : ''}</p>
      ${a.deskripsi ? `<p class="desc">${lmsEsc(a.deskripsi)}</p>` : ''}
    </article>
  `).join('');
}

// ============================================================================
// EXAMS & CBT RUNNER
// ============================================================================
async function renderExam() {
  const container = document.getElementById('exam-list');
  const empty = document.getElementById('exam-empty');
  if (!container) return;
  
  try {
    const cacheKey = `exams_${currentUser.class_id || 'all'}`;
    let exams = LMS_CACHE.get(cacheKey);

    if (!exams) {
      const allExams = await LMS.getExams();
      exams = currentUser.class_id 
        ? allExams.filter(e => e.class_id === currentUser.class_id)
        : allExams;
      LMS_CACHE.set(cacheKey, exams);
    }
      
    if (!exams.length) {
      container.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    
    if (empty) empty.classList.add('hidden');
    container.innerHTML = exams.map(e => `
      <article class="card">
        <div class="card-row">
          <div>
            <h3>${lmsEsc(e.judul)}</h3>
            <p class="meta">${lmsEsc(e.subject_nama || 'Geografi')} · Kelas ${lmsEsc(e.class_nama || '-')} · Durasi: ${e.durasi} menit · ${e.questions ? e.questions.length : 0} butir soal</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="startExam('${e.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Mulai Ujian</span>
          </button>
        </div>
      </article>
    `).join('');

  } catch (err) {
    console.error('Failed to load exam:', err);
  }
}

async function startExam(examId) {
  try {
    const allExams = await LMS.getExams();
    const exams = currentUser.class_id 
      ? allExams.filter(e => e.class_id === currentUser.class_id)
      : allExams;
    const exam = exams.find(e => e.id === examId);
    if (!exam || !exam.questions || !exam.questions.length) {
      alert('Ujian ini belum memiliki daftar pertanyaan dari guru.');
      return;
    }
    
    const modal = document.getElementById('exam-detail-modal');
    document.getElementById('exam-detail-title').textContent = exam.judul;
    document.getElementById('exam-detail-body').innerHTML = exam.questions.map((q, i) => `
      <div class="question-card">
        <div class="question-text">${i + 1}. ${lmsEsc(q.pertanyaan)}</div>
        <div class="option-list">
          ${[q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d].map((o, j) => `
            <label class="option-item" for="exam-${examId}-${i}-${j}">
              <input type="radio" name="exam-${examId}-${i}" id="exam-${examId}-${i}-${j}" value="${j}">
              <span style="font-size:13.5px;color:var(--text);">${lmsEsc(o)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
    
    modal.classList.add('show');
    
    let remaining = exam.durasi * 60;
    const timerEl = document.getElementById('exam-timer');
    const tick = () => {
      timerEl.textContent = `Sisa Waktu: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    };
    
    const iv = setInterval(() => {
      remaining--;
      tick();
      if (remaining <= 0) {
        clearInterval(iv);
        submitExam(exam.id, exam.questions);
        modal.classList.remove('show');
      }
    }, 1000);
    tick();
    
    document.getElementById('btn-submit-exam').onclick = () => {
      if (confirm('Apakah Anda yakin ingin mengumpulkan ujian ini sekarang?')) {
        clearInterval(iv);
        submitExam(exam.id, exam.questions);
        modal.classList.remove('show');
      }
    };
  } catch (err) {
    alert('Gagal memuat ujian: ' + err.message);
  }
}

async function submitExam(examId, soalList) {
  const answers = soalList.map((s, i) => {
    const picked = document.querySelector(`input[name="exam-${examId}-${i}"]:checked`);
    return { question_id: s.id, jawaban: picked ? parseInt(picked.value) : -1 };
  });

  try {
    const res = await LMS.submitExam(examId, answers);
    alert(`Ujian selesai! Nilai Anda: ${res.nilai} (Jawaban Benar: ${res.benar} dari ${res.total} butir soal)`);
    // Invalidate cache upon mutation
    LMS_CACHE.invalidate();
    renderNilai();
    renderDashboard();
  } catch (err) {
    alert('Gagal mengumpulkan jawaban ujian: ' + err.message);
  }
}

// ============================================================================
// NAVIGATION & TOOLBAR CONTROLS
// ============================================================================
const NAV_TITLES = { 
  'dashboard': 'Beranda', 
  'belajar': 'Jalur Pembelajaran', 
  'materi-saya': 'Materi Saya', 
  'tugas-saya': 'Tugas & Proyek', 
  'presensi-saya': 'Presensi Siswa', 
  'nilai-saya': 'Riwayat Nilai', 
  'exam-saya': 'Ujian (Exam)' 
};

function navigate(nav) {
  if (nav === 'dashboard') renderDashboard();
  if (nav === 'belajar' && typeof blLoadKurikulum === 'function') blLoadKurikulum();
  if (nav === 'materi-saya') renderMateri();
  if (nav === 'tugas-saya') renderAssignments();
  if (nav === 'presensi-saya') renderAttendance();
  if (nav === 'nilai-saya') renderNilai();
  if (nav === 'exam-saya') renderExam();
  if (!NAV_TITLES[nav]) return;

  setupNav(nav);
  document.querySelectorAll('.bottom-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === nav);
  });
  document.getElementById('page-title').textContent = NAV_TITLES[nav];
  const breadcrumb = document.getElementById('page-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = nav.toUpperCase().replace('-', ' ');

  showSection(nav);
  sidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('show');
}

function setupToolbars() {
  // Materi Search & Category Filter Pills
  const searchMateri = document.getElementById('materi-search-input');
  if (searchMateri) {
    searchMateri.addEventListener('input', () => filterAndDisplayMateri());
  }

  const filterPills = document.querySelectorAll('#materi-filter-pills .filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeMateriFilter = pill.dataset.filter || 'all';
      filterAndDisplayMateri();
    });
  });

  // Tugas Search
  const searchTugas = document.getElementById('tugas-search-input');
  if (searchTugas) {
    searchTugas.addEventListener('input', () => filterAndDisplayTugas());
  }

  // Refresh Button (Forces cache invalidation and fresh load)
  const btnRefresh = document.getElementById('btn-refresh-cache');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.style.transform = 'rotate(180deg)';
      LMS_CACHE.invalidate();
      await Promise.allSettled([
        renderDashboard(),
        renderMateri(),
        renderNilai(),
        renderAttendance(),
        renderAssignments(),
        renderExam()
      ]);
      setTimeout(() => { btnRefresh.style.transform = ''; }, 300);
    });
  }

  // Close modals on clicking backdrop or [data-close]
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-close]')) {
        modal.classList.remove('show');
      }
    });
  });
}

// Event Listeners for Nav items
document.querySelectorAll('.nav-item[data-nav], .bottom-nav-item[data-nav]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.nav));
});

// Mobile menu toggles
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

menuToggle?.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay?.classList.toggle('show');
});

sidebarOverlay?.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

document.addEventListener('DOMContentLoaded', init);
