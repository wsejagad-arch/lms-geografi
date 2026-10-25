// ===== STUDENT PANEL =====
let currentUser = null;
let currentTenant = null;

async function init() {
  currentUser = await LMS.checkAuth();
  if (!currentUser || currentUser.role !== 'student') {
    window.location.href = '/';
    return;
  }
  
  currentTenant = LMS.getCurrentTenant();
  document.getElementById('siswa-nama-display').textContent = currentUser.nama;
  document.getElementById('siswa-sidebar-nama').textContent = currentUser.nama;
  const initialEl = document.getElementById('user-initial');
  if (initialEl) initialEl.textContent = (currentUser.nama || 'S').trim().charAt(0);
  
  await renderDashboard();
  await renderMateri();
  await renderNilai();
  await renderAttendance();
  await renderAssignments();
  await renderExam();
  
  showSection('dashboard');
  setupNav('dashboard');
  document.getElementById('page-title').textContent = 'Beranda';
  
  document.getElementById('btn-logout-siswa')?.addEventListener('click', async () => {
    await LMS.logout();
    window.location.href = '/';
  });
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

// ===== DASHBOARD =====
async function renderDashboard() {
  try {
    const profile = currentUser;
    if (profile.nis) {
      document.getElementById('s-profile-info').textContent = 
        `${profile.nama} • NIS: ${profile.nis} • Kelas: ${profile.kelas_nama || '-'}`;
    }
    
    const [materials, grades, exams] = await Promise.all([
      currentUser.class_id ? LMS.getMaterials({ class_id: currentUser.class_id }) : LMS.getMaterials(),
      currentUser.student_id ? LMS.getGrades({ student_id: currentUser.student_id }) : LMS.getGrades(),
      currentUser.class_id ? LMS.getExams().then(e => e.filter(x => x.class_id === currentUser.class_id)) : LMS.getExams()
    ]);
    
    document.getElementById('s-stat-materi').textContent = materials.length;
    document.getElementById('s-stat-nilai').textContent = grades.length;
    document.getElementById('s-stat-exam').textContent = exams.length;
  
    // Add attendance and assignments stats
    try {
      const [attendance, assignments] = await Promise.all([
        LMS.getAttendance().then(a => a.filter(x => x.student_id === currentUser.student_id)),
        LMS.getAssignments()
      ]);
      const attendanceEl = document.getElementById('s-stat-presensi');
      if (attendanceEl) attendanceEl.textContent = attendance.length;
      const assignmentEl = document.getElementById('s-stat-tugas');
      if (assignmentEl) assignmentEl.textContent = assignments.length;
    } catch (err) {
      console.error('Stats error:', err);
    }
    
    const rata = grades.length > 0
      ? Math.round((grades.reduce((s, g) => s + g.nilai, 0) / grades.length) * 10) / 10
      : 0;
    document.getElementById('s-stat-rata').textContent = rata;
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// ===== MATERIALS =====
async function renderMateri() {
  const grid = document.getElementById('materi-grid');
  const empty = document.getElementById('materi-empty');
  if (!grid) return;
  
  try {
    const params = currentUser.class_id ? { class_id: currentUser.class_id } : {};
    const materials = await LMS.getMaterials(params);
    if (!materials.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    
    if (empty) empty.classList.add('hidden');
    grid.innerHTML = materials.map(m => `
      <article class="material-card" onclick="openMateriDetail('${m.id}')">
        ${m.image ? `<div class="thumb"><img src="${m.image}" alt=""></div>` : ''}
        <span class="class-badge">Kelas ${m.class_nama}</span>
        <h3>${m.judul}</h3>
        <p>${m.subject_nama}${m.modul ? ' · ' + m.modul : ''}${m.youtube_id ? ' · Video' : ''}</p>
      </article>
    `).join('');
  } catch (err) {
    console.error('Failed to load materi:', err);
  }
}

function openMateriDetail(id) {
  LMS.getMaterials().then(materials => {
    const m = materials.find(x => x.id === id);
    if (!m) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
      <div class="modal" style="max-width:720px">
        <div class="modal-header">
          <h3>${m.judul}</h3>
          <button class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:12px">
            <span class="badge badge-primary">${m.subject_nama}</span>
            <span class="badge badge-neutral">${m.class_nama}</span>
            ${m.modul ? `<span class="badge badge-neutral">${m.modul}</span>` : ''}
          </div>
          ${m.youtube_id ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${m.youtube_id}" frameborder="0" allowfullscreen style="border-radius:8px;margin-bottom:14px"></iframe>` : ''}
          <div style="line-height:1.7;font-size:14px">${m.konten}</div>
        </div>
        <div class="modal-footer"><button class="btn" data-close>Tutup</button></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('.modal-close')) modal.remove();
    });
  });
}

// ===== GRADES =====
async function renderNilai() {
  const tbody = document.getElementById('nilai-saya-tbody');
  if (!tbody) return;
  
  try {
    const params = currentUser.student_id ? { student_id: currentUser.student_id } : {};
    const grades = await LMS.getGrades(params);
    if (!grades.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Belum ada nilai</td></tr>';
      return;
    }
    
    tbody.innerHTML = grades.slice().reverse().map(g => `
      <tr>
        <td><span class="badge badge-primary">${g.subject_nama}</span></td>
        <td><span class="badge badge-neutral">${g.class_nama}</span></td>
        <td>${g.tipe.toUpperCase()}</td>
        <td><strong>${g.nilai}</strong></td>
        <td>${g.catatan || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Error: ${err.message}</td></tr>`;
  }
}

// ===== ATTENDANCE =====
async function renderAttendance() {
  const tbody = document.getElementById('presensi-saya-tbody');
  if (!tbody) return;
  
  try {
    const attendance = await LMS.getAttendance();
    const filtered = attendance.filter(a => a.student_id === currentUser.student_id);
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada presensi</td></tr>';
      return;
    }
    
    const badgeStatus = { hadir: 'success', izin: 'warning', sakit: 'primary', alpa: 'danger' };
    tbody.innerHTML = filtered.slice(0, 50).map(a => `
      <tr>
        <td>${a.date}</td>
        <td><span class="badge badge-${badgeStatus[a.status] || 'neutral'}">${a.status.toUpperCase()}</span></td>
        <td>${a.kelas_nama}</td>
        <td>${a.note || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Error: ${err.message}</td></tr>`;
  }
}

// ===== ASSIGNMENTS =====
async function renderAssignments() {
  const container = document.getElementById('tugas-saya-grid');
  const empty = document.getElementById('tugas-empty');
  if (!container) return;
  
  try {
    const assignments = await LMS.getAssignments();
    if (!assignments.length) {
      container.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    
    if (empty) empty.classList.add('hidden');
    container.innerHTML = assignments.map(a => `
      <article class="card">
        <div class="card-row">
          <h3>${a.judul}</h3>
          <span class="badge badge-neutral">${a.poin} poin</span>
        </div>
        <p class="meta">${a.subject_nama} · ${a.class_nama}${a.due_date ? ' · Tenggat ' + a.due_date : ''}</p>
        ${a.deskripsi ? `<p class="desc">${a.deskripsi}</p>` : ''}
      </article>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="card"><p class="meta">Error: ${err.message}</p></div>`;
  }
}

// ===== EXAMS =====
async function renderExam() {
  const container = document.getElementById('exam-list');
  const empty = document.getElementById('exam-empty');
  if (!container) return;
  
  try {
    let exams = currentUser.class_id 
      ? (await LMS.getExams()).filter(e => e.class_id === currentUser.class_id)
      : await LMS.getExams();
      
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
            <h3>${e.judul}</h3>
            <p class="meta">${e.subject_nama} · ${e.class_nama} · ${e.durasi} menit · ${e.questions ? e.questions.length : 0} soal</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="startExam('${e.id}')">Mulai</button>
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.error('Failed to load exam:', err);
  }
}

async function startExam(examId) {
  try {
    const exams = currentUser.class_id 
      ? (await LMS.getExams()).filter(e => e.class_id === currentUser.class_id)
      : await LMS.getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam || !exam.questions || !exam.questions.length) {
      alert('Exam tidak memiliki soal');
      return;
    }
    
    const modal = document.getElementById('exam-detail-modal');
    document.getElementById('exam-detail-title').textContent = exam.judul;
    document.getElementById('exam-detail-body').innerHTML = exam.questions.map((q, i) => `
      <div class="question-card">
        <div class="question-text">${i + 1}. ${q.pertanyaan}</div>
        <div class="option-list">
          ${[q.opsi_a, q.opsi_b, q.opsi_c, q.opsi_d].map((o, j) => `
            <div class="option-item">
              <input type="radio" name="exam-${examId}-${i}" id="exam-${examId}-${i}-${j}" value="${j}">
              <label for="exam-${examId}-${i}-${j}" style="font-size:13px;cursor:pointer">${o}</label>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    
    modal.classList.add('show');
    
    let remaining = exam.durasi * 60;
    const timerEl = document.getElementById('exam-timer');
    const tick = () => {
      timerEl.textContent = `Sisa: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    };
    
    const iv = setInterval(() => {
      remaining--;
      tick();
      if (remaining <= 0) {
        clearInterval(iv);
        submitExam(exam.questions);
        modal.classList.remove('show');
      }
    }, 1000);
    tick();
    
    document.getElementById('btn-submit-exam').onclick = () => {
      clearInterval(iv);
      submitExam(exam.questions);
      modal.classList.remove('show');
    };
  } catch (err) {
    alert('Gagal load exam: ' + err.message);
  }
}

async function submitExam(soalList) {
  let benar = 0;
  soalList.forEach((s, i) => {
    const picked = document.querySelector(`input[name="exam-${s.exam_id || ''}-${i}"]:checked`);
    if (picked && parseInt(picked.value) === s.jawaban) benar++;
  });
  
  const nilai = Math.round((benar / soalList.length) * 100);
  
  try {
    await LMS.createGrade({
      student_id: currentUser.student_id || currentUser.id,
      subject_id: soalList[0]?.subject_id,
      class_id: soalList[0]?.class_id,
      nilai: nilai,
      tipe: 'exam'
    });
    alert(`Exam selesai. Nilai: ${nilai} (${benar}/${soalList.length})`);
    renderNilai();
    renderDashboard();
  } catch (err) {
    alert('Gagal simpan nilai: ' + err.message);
  }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', init);

const NAV_TITLES = { 'dashboard': 'Beranda', 'belajar': 'Pembelajaran', 'materi-saya': 'Materi Saya', 'tugas-saya': 'Tugas', 'presensi-saya': 'Presensi', 'nilai-saya': 'Nilai Saya', 'exam-saya': 'Exam' };

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
  showSection(nav);
  sidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('show');
}

document.querySelectorAll('.nav-item[data-nav], .bottom-nav-item[data-nav]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.nav));
});

// Mobile menu
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
