// ===== ADMIN DASHBOARD COMPLEX =====
let currentUser = null;
let currentTenant = null;
let activeMenu = 'dashboard';

async function init() {
  currentUser = await LMS.checkAuth();
  if (!currentUser || currentUser.role === 'student') {
    window.location.href = '/';
    return;
  }
  
  currentTenant = LMS.getCurrentTenant();
  
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = currentUser.nama || currentUser.email || 'Admin';
  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) avatarEl.textContent = (currentUser.nama || currentUser.email || 'A').trim().charAt(0).toUpperCase();
  
  // If no tenant, show tenant selection
  if (!currentTenant && currentUser.role !== 'super_admin') {
    await showTenantSelection();
    return;
  }
  
  await renderDashboard();
  setupMenu('dashboard');
  
  // Event listeners
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await LMS.logout();
    window.location.href = '/';
  });
}

async function showTenantSelection() {
  const tenants = await LMS.getTenants();
  const container = document.getElementById('tenant-selection');
  if (!container) return;
  
  container.innerHTML = `
    <div class="card">
      <h3>Pilih Sekolah/Tenant</h3>
      <div class="mt-2">
        ${tenants.length === 0 ? '<p style="color:var(--text-2)">Belum ada sekolah. Buat sekolah terlebih dahulu.</p>' : 
          tenants.map(t => `
            <div class="flex justify-between items-center" style="padding:12px;border:1px solid var(--border);margin-bottom:8px;border-radius:6px">
              <div>
                <strong>${t.nama}</strong>
                <p style="font-size:12px;color:var(--text-2)">${t.slug}</p>
              </div>
              <button class="btn btn-sm btn-primary" onclick="selectTenant('${t.id}')">Pilih</button>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}

async function selectTenant(tenantId) {
  await LMS.selectTenant(tenantId);
  currentTenant = tenantId;
  document.getElementById('tenant-selection')?.classList.add('hidden');
  await init();
}

function setupMenu(menu) {
  activeMenu = menu;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.menu === menu);
  });
  
  document.querySelectorAll('.menu-section').forEach(el => {
    el.classList.toggle('hidden', el.id !== `menu-${menu}`);
  });
}

const MENU_META = {
  dashboard: { title: 'Dashboard', render: () => renderDashboard() },
  subjects: { title: 'Mapel', render: () => renderSubjects() },
  classes: { title: 'Kelas', render: () => renderClasses() },
  students: { title: 'Siswa', render: () => renderStudents() },
  materials: { title: 'Materi', render: () => renderMaterials() },
  questions: { title: 'Bank Soal', render: () => renderQuestions() },
  exams: { title: 'Exam TKA', render: () => renderExams() },
  grades: { title: 'Input Nilai', render: () => renderGrades() },
  attendance: { title: 'Presensi', render: () => renderAttendance() },
  assignments: { title: 'Tugas', render: () => renderAssignments() },
  schedules: { title: 'Jadwal', render: () => renderSchedules() }
};

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

function switchMenu(menu) {
  const meta = MENU_META[menu];
  if (!meta) return;
  setupMenu(menu);
  const title = document.getElementById('page-title');
  if (title) title.textContent = meta.title;
  document.querySelectorAll('.bottom-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === menu);
  });
  closeSidebar();
  meta.render();
}

// ===== DASHBOARD =====
async function renderDashboard() {
  try {
    const stats = await LMS.getDashboard();
    document.getElementById('stat-siswa').textContent = stats.siswa || 0;
    document.getElementById('stat-guru').textContent = stats.guru || 0;
    document.getElementById('stat-mapel').textContent = stats.mapel || 0;
    document.getElementById('stat-kelas').textContent = stats.kelas || 0;
    document.getElementById('stat-materi').textContent = stats.materi || 0;
    document.getElementById('stat-soal').textContent = stats.soal || 0;
    document.getElementById('stat-nilai').textContent = stats.nilai || 0;
    document.getElementById('stat-attendance').textContent = stats.attendance || 0;
    document.getElementById('stat-assignments').textContent = stats.assignments || 0;
    document.getElementById('stat-exam').textContent = stats.exam || 0;
    document.getElementById('stat-rata').textContent = stats.rata_nilai || 0;
    
    if (stats.tenant_nama) {
      document.getElementById('dashboard-tenant-nama').textContent = stats.tenant_nama;
    }
    
    renderKelasPerformance(stats.per_kelas || []);
    renderRecentGrades(stats.recent_grades || []);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderKelasPerformance(perKelas) {
  const tbody = document.getElementById('kelas-performance-tbody');
  if (!tbody) return;
  
  if (!perKelas.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--text-2)">Belum ada kelas</td></tr>';
    return;
  }
  
  tbody.innerHTML = perKelas.map(k => `
    <tr>
      <td><span class="badge badge-primary">${k.tingkat}</span> ${k.nama}</td>
      <td>${k.siswa}</td>
      <td><strong>${k.rata_nilai || '-'}</strong></td>
    </tr>
  `).join('');
}

function renderRecentGrades(recentGrades) {
  const tbody = document.getElementById('recent-grades-tbody');
  if (!tbody) return;
  
  if (!recentGrades.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-2)">Belum ada nilai</td></tr>';
    return;
  }
  
  tbody.innerHTML = recentGrades.map(g => `
    <tr>
      <td>${new Date(g.created_at).toLocaleDateString('id-ID')}</td>
      <td>${g.student_nama}</td>
      <td><span class="badge badge-primary">${g.subject_nama}</span></td>
      <td><span class="badge badge-neutral">${g.class_nama}</span></td>
      <td><strong>${g.nilai}</strong></td>
      <td><span class="badge ${g.tipe==='sumatif'?'badge-success':g.tipe==='formatif'?'badge-primary':'badge-warning'}">${g.tipe.toUpperCase()}</span></td>
    </tr>
  `).join('');
}

// ===== SUBJECTS (MAPEL) =====
async function renderSubjects() {
  const tbody = document.getElementById('subjects-tbody');
  if (!tbody) return;
  
  try {
    const subjects = await LMS.getSubjects();
    if (!subjects.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--text-2)">Belum ada mapel</td></tr>';
      return;
    }
    
    tbody.innerHTML = subjects.map(s => `
      <tr>
        <td>${s.kode}</td>
        <td>${s.nama}</td>
        <td>${s.deskripsi || '-'}</td>
        <td>
          <button class="btn btn-sm" onclick="editSubject('${s.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSubject('${s.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

function lockSubjectIdentity(locked) {
  ['subject-kode', 'subject-nama'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.readOnly = locked;
  });
}

function openSubjectModal(s = null) {
  const modal = document.getElementById('subject-modal');
  document.getElementById('subject-form').reset();
  if (s) {
    document.getElementById('subject-id').value = s.id;
    document.getElementById('subject-kode').value = s.kode;
    document.getElementById('subject-nama').value = s.nama;
    document.getElementById('subject-deskripsi').value = s.deskripsi || '';
    lockSubjectIdentity(false);
  } else {
    document.getElementById('subject-id').value = '';
    document.getElementById('subject-kode').value = 'GEO';
    document.getElementById('subject-nama').value = 'Geografi';
    lockSubjectIdentity(true);
  }
  modal.classList.add('show');
}

async function saveSubject() {
  const id = document.getElementById('subject-id').value;
  const data = {
    kode: document.getElementById('subject-kode').value.trim(),
    nama: document.getElementById('subject-nama').value.trim(),
    deskripsi: document.getElementById('subject-deskripsi').value.trim()
  };
  
  if (!id) {
    data.kode = 'GEO';
    data.nama = 'Geografi';
  }
  
  if (!data.kode || !data.nama) {
    alert('Kode dan nama mapel wajib diisi');
    return;
  }
  
  try {
    if (!id) {
      const subjects = await LMS.getSubjects();
      if (subjects.some(s => s.nama.trim().toLowerCase() === 'geografi')) {
        alert('Mapel Geografi sudah ada');
        return;
      }
    }
    if (id) {
      await LMS.updateSubject(id, data);
    } else {
      await LMS.createSubject(data);
    }
    document.getElementById('subject-modal').classList.remove('show');
    renderSubjects();
    renderDashboard();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function editSubject(id) {
  try {
    const subjects = await LMS.getSubjects();
    const s = subjects.find(x => x.id === id);
    if (s) openSubjectModal(s);
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function deleteSubject(id) {
  if (!confirm('Hapus mapel ini?')) return;
  try {
    await LMS.deleteSubject(id);
    renderSubjects();
    renderDashboard();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== CLASSES =====
async function renderClasses() {
  const tbody = document.getElementById('classes-tbody');
  if (!tbody) return;
  
  try {
    const classes = await LMS.getClasses();
    if (!classes.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-2)">Belum ada kelas</td></tr>';
      return;
    }
    
    tbody.innerHTML = classes.map(c => `
      <tr>
        <td><span class="badge badge-primary">${c.tingkat}</span></td>
        <td>${c.nama}</td>
        <td>${c.jurusan || '-'}</td>
        <td>${c.wali_kelas || '-'}</td>
        <td>
          <button class="btn btn-sm" onclick="editClass('${c.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteClass('${c.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

function openClassModal(c = null) {
  const modal = document.getElementById('class-modal');
  document.getElementById('class-form').reset();
  if (c) {
    document.getElementById('class-id').value = c.id;
    document.getElementById('class-nama').value = c.nama;
    document.getElementById('class-tingkat').value = c.tingkat;
    document.getElementById('class-jurusan').value = c.jurusan || '';
    document.getElementById('class-wali').value = c.wali_kelas || '';
  } else {
    document.getElementById('class-id').value = '';
  }
  modal.classList.add('show');
}

async function saveClass() {
  const id = document.getElementById('class-id').value;
  const data = {
    nama: document.getElementById('class-nama').value.trim(),
    tingkat: document.getElementById('class-tingkat').value,
    jurusan: document.getElementById('class-jurusan').value.trim(),
    wali_kelas: document.getElementById('class-wali').value.trim()
  };
  
  if (!data.nama || !data.tingkat) {
    alert('Nama dan tingkat kelas wajib diisi');
    return;
  }
  
  try {
    if (id) {
      await LMS.updateClass(id, data);
    } else {
      await LMS.createClass(data);
    }
    document.getElementById('class-modal').classList.remove('show');
    renderClasses();
    renderDashboard();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function editClass(id) {
  try {
    const classes = await LMS.getClasses();
    const c = classes.find(x => x.id === id);
    if (c) openClassModal(c);
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function deleteClass(id) {
  if (!confirm('Hapus kelas ini?')) return;
  try {
    await LMS.deleteClass(id);
    renderClasses();
    renderDashboard();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== STUDENTS =====
function waLink(no_wa) {
  const digits = String(no_wa || '').replace(/\D/g, '');
  if (!digits) return '';
  const intl = digits.startsWith('62') ? digits : (digits.startsWith('0') ? `62${digits.slice(1)}` : `62${digits}`);
  return `https://wa.me/${intl}`;
}

async function renderStudents() {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  
  try {
    const students = await LMS.getStudents();
    if (!students.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-2)">Belum ada siswa</td></tr>';
      return;
    }
    
    tbody.innerHTML = students.map(s => `
      <tr>
        <td>${s.nis}</td>
        <td>${s.nama}</td>
        <td>${s.email || '-'}</td>
        <td>${s.no_wa ? `<a class="wa-link" href="${waLink(s.no_wa)}" target="_blank" rel="noopener">${s.no_wa}</a>` : '-'}</td>
        <td><span class="badge badge-primary">${s.kelas_nama}</span></td>
        <td>
          <button class="btn btn-sm" onclick="editStudent('${s.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

const STUDENT_TEMPLATE_HEADER = ['nis', 'nama', 'email', 'no_wa', 'kelas'];

function downloadStudentTemplate() {
  const rows = [
    STUDENT_TEMPLATE_HEADER.join(','),
    '2024001,Ani Lestari,ani@sekolah.id,081234567890,X-1',
    '2024002,Budi Hartono,budi@sekolah.id,6281234567891,X-1'
  ];
  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template-siswa.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',' || ch === ';') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseStudentCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  
  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = {
    nis: header.indexOf('nis'),
    nama: header.indexOf('nama'),
    email: header.indexOf('email'),
    no_wa: header.findIndex(h => h === 'no_wa' || h === 'wa' || h === 'no wa' || h === 'nomor wa' || h === 'whatsapp'),
    kelas: header.indexOf('kelas')
  };
  if (idx.nis < 0 || idx.nama < 0 || idx.kelas < 0) {
    throw new Error('Header wajib: nis, nama, kelas (opsional: email, no_wa)');
  }
  
  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line);
    const pick = i => (i >= 0 ? (cols[i] || '').trim() : '');
    return {
      nis: pick(idx.nis),
      nama: pick(idx.nama),
      email: pick(idx.email),
      no_wa: pick(idx.no_wa),
      kelas: pick(idx.kelas)
    };
  });
}

async function importStudentFile(file) {
  try {
    const text = await file.text();
    const rows = parseStudentCsv(text);
    if (!rows.length) {
      alert('File CSV tidak berisi data');
      return;
    }
    
    const result = await LMS.importStudents(rows);
    const lines = [`Ditambahkan: ${result.created}`, `Dilewati (NIS sudah ada): ${result.skipped}`];
    if (result.errors.length) {
      lines.push('Gagal:');
      result.errors.slice(0, 10).forEach(e => lines.push(`- baris ${e.baris} (${e.nis || '-'}): ${e.error}`));
      if (result.errors.length > 10) lines.push(`- dan ${result.errors.length - 10} baris lain`);
    }
    alert(lines.join('\n'));
    renderStudents();
    renderDashboard();
  } catch (err) {
    alert('Gagal impor: ' + err.message);
  }
}

async function openStudentModal(student = null) {
  const modal = document.getElementById('student-modal');
  document.getElementById('student-form').reset();
  
  try {
    const classes = await LMS.getClasses();
    const sel = document.getElementById('student-kelas');
    sel.innerHTML = '<option value="">Pilih Kelas</option>' +
      classes.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    
    if (student) {
      document.getElementById('student-id').value = student.id;
      document.getElementById('student-nama').value = student.nama;
      document.getElementById('student-nis').value = student.nis;
      document.getElementById('student-email').value = student.email || '';
      document.getElementById('student-wa').value = student.no_wa || '';
      sel.value = student.kelas_id;
    } else {
      document.getElementById('student-id').value = '';
    }
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load kelas: ' + err.message);
  }
}

async function saveStudent() {
  const id = document.getElementById('student-id').value;
  const data = {
    nama: document.getElementById('student-nama').value.trim(),
    nis: document.getElementById('student-nis').value.trim(),
    email: document.getElementById('student-email').value.trim(),
    no_wa: document.getElementById('student-wa').value.trim(),
    class_id: document.getElementById('student-kelas').value
  };
  
  if (!data.nama || !data.nis || !data.class_id) {
    alert('Nama, NIS, dan Kelas wajib diisi');
    return;
  }
  
  try {
    if (id) {
      await LMS.updateStudent(id, data);
    } else {
      await LMS.createStudent(data);
    }
    document.getElementById('student-modal').classList.remove('show');
    renderStudents();
    renderDashboard();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function editStudent(id) {
  try {
    const students = await LMS.getStudents();
    const s = students.find(x => x.id === id);
    if (s) await openStudentModal(s);
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function deleteStudent(id) {
  if (!confirm('Hapus siswa ini?')) return;
  try {
    await LMS.deleteStudent(id);
    renderStudents();
    renderDashboard();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== MATERIALS =====
async function renderMaterials() {
  const tbody = document.getElementById('materials-tbody');
  if (!tbody) return;
  
  try {
    const materials = await LMS.getMaterials();
    if (!materials.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-2)">Belum ada materi</td></tr>';
      return;
    }
    
    tbody.innerHTML = materials.map(m => `
      <tr>
        <td><span class="badge badge-primary">${m.class_nama}</span></td>
        <td>${m.subject_nama}</td>
        <td>${m.judul}</td>
        <td>${m.modul || '-'}</td>
        <td>${m.youtube_id ? '<span class="badge badge-success">Video</span>' : '-'}</td>
        <td>
          <button class="btn btn-sm" onclick="editMaterial('${m.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMaterial('${m.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openMaterialModal(material = null) {
  const modal = document.getElementById('material-modal');
  document.getElementById('material-form').reset();
  
  try {
    const [subjects, classes] = await Promise.all([
      LMS.getSubjects(),
      LMS.getClasses()
    ]);
    
    const subjectSel = document.getElementById('material-subject');
    subjectSel.innerHTML = '<option value="">Pilih Mapel</option>' +
      subjects.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');
    
    const classSel = document.getElementById('material-class');
    classSel.innerHTML = '<option value="">Pilih Kelas</option>' +
      classes.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    
    if (material) {
      document.getElementById('material-id').value = material.id;
      subjectSel.value = material.subject_id;
      classSel.value = material.class_id;
      document.getElementById('material-judul').value = material.judul;
      document.getElementById('material-konten').value = material.konten;
      document.getElementById('material-youtube').value = material.youtube_id || '';
      document.getElementById('material-image').value = material.image || '';
      document.getElementById('material-modul').value = material.modul || '';
      document.getElementById('material-tipe').value = material.tipe || 'materi';
    } else {
      document.getElementById('material-id').value = '';
    }
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveMaterial() {
  const id = document.getElementById('material-id').value;
  const data = {
    judul: document.getElementById('material-judul').value.trim(),
    konten: document.getElementById('material-konten').value.trim(),
    subject_id: document.getElementById('material-subject').value,
    class_id: document.getElementById('material-class').value,
    youtube_id: document.getElementById('material-youtube').value.trim(),
    image: document.getElementById('material-image').value.trim(),
    modul: document.getElementById('material-modul').value.trim(),
    tipe: document.getElementById('material-tipe').value
  };
  
  if (!data.judul || !data.subject_id || !data.class_id) {
    alert('Judul, mapel, dan kelas wajib diisi');
    return;
  }
  
  try {
    if (id) {
      await LMS.updateMaterial(id, data);
    } else {
      await LMS.createMaterial(data);
    }
    document.getElementById('material-modal').classList.remove('show');
    renderMaterials();
    renderDashboard();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function editMaterial(id) {
  try {
    const materials = await LMS.getMaterials();
    const m = materials.find(x => x.id === id);
    if (m) await openMaterialModal(m);
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function deleteMaterial(id) {
  if (!confirm('Hapus materi ini?')) return;
  try {
    await LMS.deleteMaterial(id);
    renderMaterials();
    renderDashboard();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== QUESTIONS =====
async function renderQuestions() {
  const tbody = document.getElementById('questions-tbody');
  if (!tbody) return;
  
  try {
    const questions = await LMS.getQuestions();
    if (!questions.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-2)">Belum ada soal</td></tr>';
      return;
    }
    
    tbody.innerHTML = questions.map(q => `
      <tr>
        <td><span class="badge badge-primary">${q.kelas || '-'}</span></td>
        <td><span class="badge ${q.jenis==='formatif'?'badge-primary':q.jenis==='sumatif'?'badge-success':'badge-warning'}">${q.jenis.toUpperCase()}</span></td>
        <td>${q.pertanyaan.substring(0, 50)}...</td>
        <td>${q.poin}</td>
        <td>
          <button class="btn btn-sm" onclick="editQuestion('${q.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${q.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openQuestionModal(question = null) {
  const modal = document.getElementById('question-modal');
  document.getElementById('question-form').reset();
  
  try {
    const subjects = await LMS.getSubjects();
    const subjectSel = document.getElementById('question-subject');
    subjectSel.innerHTML = '<option value="">Pilih Mapel</option>' +
      subjects.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');
    
    if (question) {
      document.getElementById('question-id').value = question.id;
      subjectSel.value = question.subject_id;
      document.getElementById('question-pertanyaan').value = question.pertanyaan;
      document.getElementById('question-opsi-a').value = question.opsi_a;
      document.getElementById('question-opsi-b').value = question.opsi_b;
      document.getElementById('question-opsi-c').value = question.opsi_c;
      document.getElementById('question-opsi-d').value = question.opsi_d;
      document.getElementById('question-jawaban').value = question.jawaban;
      document.getElementById('question-jenis').value = question.jenis;
      document.getElementById('question-poin').value = question.poin;
      document.getElementById('question-kelas').value = question.kelas || '';
    } else {
      document.getElementById('question-id').value = '';
    }
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveQuestion() {
  const id = document.getElementById('question-id').value;
  const data = {
    pertanyaan: document.getElementById('question-pertanyaan').value.trim(),
    opsi_a: document.getElementById('question-opsi-a').value.trim(),
    opsi_b: document.getElementById('question-opsi-b').value.trim(),
    opsi_c: document.getElementById('question-opsi-c').value.trim(),
    opsi_d: document.getElementById('question-opsi-d').value.trim(),
    jawaban: document.getElementById('question-jawaban').value,
    subject_id: document.getElementById('question-subject').value,
    jenis: document.getElementById('question-jenis').value,
    poin: document.getElementById('question-poin').value,
    kelas: document.getElementById('question-kelas').value
  };
  
  if (!data.pertanyaan || !data.opsi_a || !data.subject_id) {
    alert('Pertanyaan, opsi, dan mapel wajib diisi');
    return;
  }
  
  try {
    if (id) {
      await LMS.updateQuestion(id, data);
    } else {
      await LMS.createQuestion(data);
    }
    document.getElementById('question-modal').classList.remove('show');
    renderQuestions();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function editQuestion(id) {
  try {
    const questions = await LMS.getQuestions();
    const q = questions.find(x => x.id === id);
    if (q) await openQuestionModal(q);
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function deleteQuestion(id) {
  if (!confirm('Hapus soal ini?')) return;
  try {
    await LMS.deleteQuestion(id);
    renderQuestions();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== EXAMS =====
async function renderExams() {
  const tbody = document.getElementById('exams-tbody');
  if (!tbody) return;
  
  try {
    const exams = await LMS.getExams();
    if (!exams.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-2)">Belum ada exam</td></tr>';
      return;
    }
    
    tbody.innerHTML = exams.map(e => `
      <tr>
        <td>${e.judul}</td>
        <td><span class="badge badge-primary">${e.subject_nama}</span></td>
        <td><span class="badge badge-neutral">${e.class_nama}</span></td>
        <td>${e.durasi} menit</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteExam('${e.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openExamModal() {
  const modal = document.getElementById('exam-modal');
  document.getElementById('exam-form').reset();
  
  try {
    const [subjects, classes, questions] = await Promise.all([
      LMS.getSubjects(),
      LMS.getClasses(),
      LMS.getQuestions()
    ]);
    
    const subjectSel = document.getElementById('exam-subject');
    subjectSel.innerHTML = '<option value="">Pilih Mapel</option>' +
      subjects.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');
    
    const classSel = document.getElementById('exam-class');
    classSel.innerHTML = '<option value="">Pilih Kelas</option>' +
      classes.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    
    const questionSel = document.getElementById('exam-questions');
    if (questions.length === 0) {
      questionSel.innerHTML = '<option value="">Belum ada soal</option>';
    } else {
      questionSel.innerHTML = questions.map((q, i) => 
        `<option value="${q.id}">${i + 1}. ${q.pertanyaan.substring(0, 60)}...</option>`
      ).join('');
    }
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveExam() {
  const judul = document.getElementById('exam-judul').value.trim();
  const subject_id = document.getElementById('exam-subject').value;
  const class_id = document.getElementById('exam-class').value;
  const durasi = document.getElementById('exam-durasi').value;
  const selected = Array.from(document.getElementById('exam-questions').selectedOptions).map(o => o.value);
  
  if (!judul || !subject_id || !class_id || !durasi || !selected.length) {
    alert('Semua field wajib diisi');
    return;
  }
  
  try {
    await LMS.createExam({ judul, subject_id, class_id, durasi, question_ids: selected });
    document.getElementById('exam-modal').classList.remove('show');
    renderExams();
    renderDashboard();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function deleteExam(id) {
  if (!confirm('Hapus exam ini?')) return;
  try {
    await LMS.deleteExam(id);
    renderExams();
    renderDashboard();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== GRADES =====
async function renderGrades() {
  const tbody = document.getElementById('grades-tbody');
  if (!tbody) return;
  
  try {
    const grades = await LMS.getGrades();
    if (!grades.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-2)">Belum ada nilai</td></tr>';
      return;
    }
    
    tbody.innerHTML = grades.slice(0, 100).map(g => `
      <tr>
        <td>${g.student_nama}</td>
        <td><span class="badge badge-primary">${g.subject_nama}</span></td>
        <td><span class="badge badge-neutral">${g.class_nama}</span></td>
        <td>${g.tipe.toUpperCase()}</td>
        <td><strong>${g.nilai}</strong></td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteGrade('${g.id}')">Hapus</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openGradeModal() {
  const modal = document.getElementById('grade-modal');
  document.getElementById('grade-form').reset();
  
  try {
    const [students, subjects, classes] = await Promise.all([
      LMS.getStudents(),
      LMS.getSubjects(),
      LMS.getClasses()
    ]);
    
    const studentSel = document.getElementById('grade-student');
    studentSel.innerHTML = '<option value="">Pilih Siswa</option>' +
      students.map(s => `<option value="${s.id}">${s.nama} (${s.kelas_nama})</option>`).join('');
    
    const subjectSel = document.getElementById('grade-subject');
    subjectSel.innerHTML = '<option value="">Pilih Mapel</option>' +
      subjects.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');
    
    const classSel = document.getElementById('grade-class');
    classSel.innerHTML = '<option value="">Pilih Kelas</option>' +
      classes.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveGrade() {
  const data = {
    student_id: document.getElementById('grade-student').value,
    subject_id: document.getElementById('grade-subject').value,
    class_id: document.getElementById('grade-class').value,
    nilai: document.getElementById('grade-nilai').value,
    catatan: document.getElementById('grade-catatan').value.trim(),
    tipe: document.getElementById('grade-tipe').value
  };
  
  if (!data.student_id || !data.subject_id || !data.class_id || !data.nilai) {
    alert('Siswa, mapel, kelas, dan nilai wajib diisi');
    return;
  }
  
  try {
    await LMS.createGrade(data);
    document.getElementById('grade-modal').classList.remove('show');
    renderGrades();
    renderDashboard();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function deleteGrade(id) {
  if (!confirm('Hapus nilai ini?')) return;
  try {
    await LMS.deleteGrade(id);
    renderGrades();
    renderDashboard();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== SEED =====
async function runSeed() {
  if (!confirm('Ini akan mengisi data contoh. Lanjutkan?')) return;
  try {
    const result = await LMS.seedData();
    alert('Data berhasil diisi!');
    await renderDashboard();
    renderSubjects();
    renderClasses();
    renderStudents();
    renderMaterials();
    renderQuestions();
    renderExams();
    renderGrades();
    renderAttendance();
    renderAssignments();
  } catch (err) {
    alert('Gagal seed: ' + err.message);
  }
}

// ===== ATTENDANCE =====
async function renderAttendance() {
  const tbody = document.getElementById('attendance-tbody');
  if (!tbody) return;
  
  try {
    const attendance = await LMS.getAttendance();
    if (!attendance.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-2)">Belum ada presensi</td></tr>';
      return;
    }
    
    tbody.innerHTML = attendance.slice(0, 50).map(a => `
      <tr>
        <td>${a.date}</td>
        <td>${a.student_nama}</td>
        <td><span class="badge badge-neutral">${a.kelas_nama}</span></td>
        <td><span class="badge badge-${a.status==='hadir'?'success':a.status==='izin'?'badge-warning':a.status==='sakit'?'badge-primary':'badge-danger'}">${a.status.toUpperCase()}</span></td>
        <td>${a.note || '-'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteAttendance('${a.id}')">Hapus</button></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openAttendanceModal() {
  const modal = document.getElementById('attendance-modal');
  document.getElementById('attendance-form').reset();
  
  try {
    const [students, classes] = await Promise.all([
      LMS.getStudents(),
      LMS.getClasses()
    ]);
    
    const studentSel = document.getElementById('attendance-student');
    studentSel.innerHTML = '<option value="">Pilih Siswa</option>' +
      students.map(s => `<option value="${s.id}">${s.nama} (${s.kelas_nama})</option>`).join('');
    
    const classSel = document.getElementById('attendance-class');
    classSel.innerHTML = '<option value="">Pilih Kelas</option>' +
      classes.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveAttendance() {
  const data = {
    student_id: document.getElementById('attendance-student').value,
    date: document.getElementById('attendance-date').value,
    kelas_id: document.getElementById('attendance-class').value,
    status: document.getElementById('attendance-status').value,
    note: document.getElementById('attendance-note').value.trim()
  };
  
  if (!data.student_id || !data.date || !data.kelas_id) {
    alert('Siswa, tanggal, dan kelas wajib diisi');
    return;
  }
  
  try {
    await LMS.createAttendance(data);
    document.getElementById('attendance-modal').classList.remove('show');
    renderAttendance();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function deleteAttendance(id) {
  if (!confirm('Hapus presensi ini?')) return;
  try {
    await LMS.deleteAttendance(id);
    renderAttendance();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== ASSIGNMENTS =====
async function renderAssignments() {
  const tbody = document.getElementById('assignments-tbody');
  if (!tbody) return;
  
  try {
    const assignments = await LMS.getAssignments();
    if (!assignments.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-2)">Belum ada tugas</td></tr>';
      return;
    }
    
    tbody.innerHTML = assignments.map(a => `
      <tr>
        <td><strong>${a.judul}</strong></td>
        <td><span class="badge badge-primary">${a.subject_nama}</span></td>
        <td><span class="badge badge-neutral">${a.class_nama}</span></td>
        <td>${a.due_date || '-'}</td>
        <td>${a.poin}</td>
        <td>
          <button class="btn btn-sm" onclick="editAssignment('${a.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAssignment('${a.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openAssignmentModal(assignment = null) {
  const modal = document.getElementById('assignment-modal');
  document.getElementById('assignment-form').reset();
  
  try {
    const [subjects, classes] = await Promise.all([
      LMS.getSubjects(),
      LMS.getClasses()
    ]);
    
    const subjectSel = document.getElementById('assignment-subject');
    subjectSel.innerHTML = '<option value="">Pilih Mapel</option>' +
      subjects.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');
    
    const classSel = document.getElementById('assignment-class');
    classSel.innerHTML = '<option value="">Pilih Kelas</option>' +
      classes.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    
    if (assignment) {
      document.getElementById('assignment-id').value = assignment.id;
      document.getElementById('assignment-judul').value = assignment.judul;
      document.getElementById('assignment-deskripsi').value = assignment.deskripsi || '';
      document.getElementById('assignment-subject').value = assignment.subject_id;
      document.getElementById('assignment-class').value = assignment.class_id;
      document.getElementById('assignment-due').value = assignment.due_date || '';
      document.getElementById('assignment-poin').value = assignment.poin;
    } else {
      document.getElementById('assignment-id').value = '';
    }
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveAssignment() {
  const id = document.getElementById('assignment-id').value;
  const data = {
    judul: document.getElementById('assignment-judul').value.trim(),
    deskripsi: document.getElementById('assignment-deskripsi').value.trim(),
    subject_id: document.getElementById('assignment-subject').value,
    class_id: document.getElementById('assignment-class').value,
    due_date: document.getElementById('assignment-due').value,
    poin: document.getElementById('assignment-poin').value
  };
  
  if (!data.judul || !data.subject_id || !data.class_id) {
    alert('Judul, mapel, dan kelas wajib diisi');
    return;
  }
  
  try {
    if (id) {
      await LMS.updateAssignment(id, data);
    } else {
      await LMS.createAssignment(data);
    }
    document.getElementById('assignment-modal').classList.remove('show');
    renderAssignments();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function editAssignment(id) {
  try {
    const assignments = await LMS.getAssignments();
    const a = assignments.find(x => x.id === id);
    if (a) await openAssignmentModal(a);
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function deleteAssignment(id) {
  if (!confirm('Hapus tugas ini?')) return;
  try {
    await LMS.deleteAssignment(id);
    renderAssignments();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== SCHEDULES =====
async function renderSchedules() {
  const tbody = document.getElementById('schedules-tbody');
  if (!tbody) return;
  
  try {
    const schedules = await LMS.getSchedules();
    if (!schedules.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--text-2)">Belum ada jadwal</td></tr>';
      return;
    }
    
    tbody.innerHTML = schedules.map(s => `
      <tr>
        <td><strong>${s.hari}</strong></td>
        <td>${s.jam_mulai} - ${s.jam_selesai}</td>
        <td><span class="badge badge-primary">${s.subject_nama}</span></td>
        <td><span class="badge badge-neutral">${s.class_nama}</span></td>
        <td>${s.ruangan || '-'}</td>
        <td>${s.guru || '-'}</td>
        <td>
          <button class="btn btn-sm" onclick="editSchedule('${s.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${s.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openScheduleModal(schedule = null) {
  const modal = document.getElementById('schedule-modal');
  document.getElementById('schedule-form').reset();
  
  try {
    const [subjects, classes] = await Promise.all([
      LMS.getSubjects(),
      LMS.getClasses()
    ]);
    
    const subjectSel = document.getElementById('schedule-subject');
    subjectSel.innerHTML = '<option value="">Pilih Mapel</option>' +
      subjects.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');
    
    const classSel = document.getElementById('schedule-class');
    classSel.innerHTML = '<option value="">Pilih Kelas</option>' +
      classes.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    
    if (schedule) {
      document.getElementById('schedule-id').value = schedule.id;
      document.getElementById('schedule-hari').value = schedule.hari || 'Senin';
      document.getElementById('schedule-mulai').value = schedule.jam_mulai || '07:00';
      document.getElementById('schedule-selesai').value = schedule.jam_selesai || '08:30';
      document.getElementById('schedule-subject').value = schedule.subject_id;
      document.getElementById('schedule-class').value = schedule.class_id;
      document.getElementById('schedule-ruangan').value = schedule.ruangan || '';
      document.getElementById('schedule-guru').value = schedule.guru || '';
    } else {
      document.getElementById('schedule-id').value = '';
    }
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveSchedule() {
  const id = document.getElementById('schedule-id').value;
  const data = {
    hari: document.getElementById('schedule-hari').value,
    jam_mulai: document.getElementById('schedule-mulai').value,
    jam_selesai: document.getElementById('schedule-selesai').value,
    subject_id: document.getElementById('schedule-subject').value,
    class_id: document.getElementById('schedule-class').value,
    ruangan: document.getElementById('schedule-ruangan').value.trim(),
    guru: document.getElementById('schedule-guru').value.trim()
  };
  
  if (!data.subject_id || !data.class_id) {
    alert('Mapel dan kelas wajib diisi');
    return;
  }
  
  try {
    if (id) {
      await LMS.updateSchedule(id, data);
    } else {
      await LMS.createSchedule(data);
    }
    document.getElementById('schedule-modal').classList.remove('show');
    renderSchedules();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
  }
}

async function editSchedule(id) {
  try {
    const schedules = await LMS.getSchedules();
    const s = schedules.find(x => x.id === id);
    if (s) await openScheduleModal(s);
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function deleteSchedule(id) {
  if (!confirm('Hapus jadwal ini?')) return;
  try {
    await LMS.deleteSchedule(id);
    renderSchedules();
  } catch (err) {
    alert('Gagal hapus: ' + err.message);
  }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
  init();
  
  // Subjects
  document.getElementById('btn-add-subject')?.addEventListener('click', () => openSubjectModal());
  document.getElementById('btn-save-subject')?.addEventListener('click', saveSubject);
  
  // Classes
  document.getElementById('btn-add-class')?.addEventListener('click', () => openClassModal());
  document.getElementById('btn-save-class')?.addEventListener('click', saveClass);
  
  // Students
  document.getElementById('btn-add-student')?.addEventListener('click', () => openStudentModal());
  document.getElementById('btn-save-student')?.addEventListener('click', saveStudent);
  document.getElementById('btn-student-template')?.addEventListener('click', downloadStudentTemplate);
  document.getElementById('btn-student-import')?.addEventListener('click', () => {
    document.getElementById('student-import-file').click();
  });
  document.getElementById('student-import-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importStudentFile(file);
    e.target.value = '';
  });
  
  // Materials
  document.getElementById('btn-add-material')?.addEventListener('click', () => openMaterialModal());
  document.getElementById('btn-save-material')?.addEventListener('click', saveMaterial);
  
  // Questions
  document.getElementById('btn-add-question')?.addEventListener('click', () => openQuestionModal());
  document.getElementById('btn-save-question')?.addEventListener('click', saveQuestion);
  
  // Exams
  document.getElementById('btn-add-exam')?.addEventListener('click', openExamModal);
  document.getElementById('btn-save-exam')?.addEventListener('click', saveExam);
  
  // Grades
  document.getElementById('btn-add-grade')?.addEventListener('click', openGradeModal);
  document.getElementById('btn-save-grade')?.addEventListener('click', saveGrade);
  
  // Attendance
  document.getElementById('btn-add-attendance')?.addEventListener('click', openAttendanceModal);
  document.getElementById('btn-save-attendance')?.addEventListener('click', saveAttendance);
  
  // Assignments
  document.getElementById('btn-add-assignment')?.addEventListener('click', () => openAssignmentModal());
  document.getElementById('btn-save-assignment')?.addEventListener('click', saveAssignment);
  
  // Schedules
  document.getElementById('btn-add-schedule')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('btn-save-schedule')?.addEventListener('click', saveSchedule);
  
  // Seed
  document.getElementById('btn-seed')?.addEventListener('click', runSeed);
  
  // Modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('show'));
  });
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
  });
  
  // Menu
  document.querySelectorAll('.nav-item[data-menu]').forEach(el => {
    el.addEventListener('click', () => switchMenu(el.dataset.menu));
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
  
  // Bottom nav
  document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchMenu(btn.dataset.nav));
  });
});
