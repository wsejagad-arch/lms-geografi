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
  
  currentTenant = LMS.getCurrentTenant() || currentUser.tenant_id || null;
  
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = currentUser.nama || currentUser.email || 'Admin';
  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) avatarEl.textContent = (currentUser.nama || currentUser.email || 'A').trim().charAt(0).toUpperCase();
  
  // Belum ada tenant aktif: super_admin dengan satu sekolah dipilih otomatis, lainnya pilih manual
  if (!currentTenant) {
    const tenants = await LMS.getTenants();
    if (currentUser.role === 'super_admin' && tenants.length === 1) {
      await LMS.selectTenant(tenants[0].id);
      currentTenant = tenants[0].id;
    } else {
      await showTenantSelection();
      return;
    }
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
  progress: { title: 'Progres Belajar', render: () => renderProgress() },
  sessions: { title: 'User Aktif', render: () => renderSessions() },
  materials: { title: 'Materi', render: () => renderMaterials() },
  kurikulum: { title: 'Kurikulum', render: () => renderKurikulum() },
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

let studentsCache = [];

async function renderStudents() {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  
  try {
    studentsCache = await LMS.getStudents();
    renderStudentClassFilter();
    renderStudentRows();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

function renderStudentClassFilter() {
  const sel = document.getElementById('student-filter-kelas');
  if (!sel) return;
  const current = sel.value;
  const names = [...new Set(studentsCache.map(s => s.kelas_nama).filter(n => n && n !== '-'))]
    .sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  sel.innerHTML = '<option value="">Semua Kelas</option>' +
    names.map(n => `<option value="${n}">${n}</option>`).join('');
  sel.value = names.includes(current) ? current : '';
}

function filterStudents() {
  const q = (document.getElementById('student-filter-nama')?.value || '').trim().toLowerCase();
  const kelas = document.getElementById('student-filter-kelas')?.value || '';
  return studentsCache.filter(s => {
    if (kelas && s.kelas_nama !== kelas) return false;
    if (!q) return true;
    return [s.nama, s.nis, s.nisn, s.email]
      .some(v => String(v || '').toLowerCase().includes(q));
  });
}

function renderStudentRows() {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  
  const students = filterStudents();
  if (!students.length) {
    const total = studentsCache.length;
    const msg = total ? 'Tidak ada siswa yang cocok dengan filter' : 'Belum ada siswa';
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-2)">${msg}</td></tr>`;
    return;
  }
  
  tbody.innerHTML = students.map(s => `
    <tr>
      <td>${s.nis}</td>
      <td>${s.nisn || '-'}</td>
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
}

function resetStudentFilter() {
  const nama = document.getElementById('student-filter-nama');
  const kelas = document.getElementById('student-filter-kelas');
  if (nama) nama.value = '';
  if (kelas) kelas.value = '';
  renderStudentRows();
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

let progressRows = [];

function progressFilteredRows() {
  const kelasEl = document.getElementById('progress-filter-kelas');
  const namaEl = document.getElementById('progress-filter-nama');
  const kelas = kelasEl ? kelasEl.value : '';
  const q = (namaEl ? namaEl.value : '').trim().toLowerCase();
  return progressRows.filter(s => {
    if (kelas && (s.kelas_nama || '') !== kelas) return false;
    if (q) {
      const hay = `${s.nama || ''} ${s.nis || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderProgressRows() {
  const tbody = document.getElementById('progress-tbody');
  if (!tbody) return;
  const rows = progressFilteredRows();
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color:var(--text-2)">Tidak ada data</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(s => {
    const pct = s.total ? Math.round((s.tuntas / s.total) * 100) : 0;
    return `
      <tr>
        <td>${s.nis || '-'}</td>
        <td>${s.nama}</td>
        <td>${s.kelas_nama || '-'}</td>
        <td><span class="badge badge-primary">${s.level}</span></td>
        <td style="min-width:150px">
          <div class="progress-mini"><span style="width:${pct}%"></span></div>
          <span style="font-size:11.5px;color:var(--text-2)">${pct}% · ${s.tuntas}/${s.total} materi</span>
        </td>
        <td><strong>${s.rata_best === null ? '-' : s.rata_best}</strong></td>
        <td>${s.total_attempts || 0}×</td>
        <td>${s.items.map(i => `<span class="badge ${i.tuntas ? 'badge-success' : 'badge-neutral'}">${i.bab_id}: ${i.best_score === null ? '-' : i.best_score}${i.attempts ? ' · ' + i.attempts + '×' : ''}</span>`).join(' ')}</td>
      </tr>
    `;
  }).join('');
}

function progressExportInfo() {
  const kelasEl = document.getElementById('progress-filter-kelas');
  const namaEl = document.getElementById('progress-filter-nama');
  return {
    kelas: kelasEl && kelasEl.value ? kelasEl.value : 'Semua Kelas',
    nama: namaEl && namaEl.value ? namaEl.value.trim() : ''
  };
}

async function progressTenantName() {
  try {
    const tenants = await LMS.getTenants();
    const t = tenants.find(x => x.id === LMS.getCurrentTenant()) || tenants[0];
    if (t) return t.nama;
  } catch (e) { /* abaikan */ }
  return 'LMS Geografi';
}

async function printProgressReport() {
  const rows = progressFilteredRows();
  if (!rows.length) { alert('Tidak ada data untuk dicetak'); return; }
  const info = progressExportInfo();
  const tenantNama = await progressTenantName();
  const head = document.getElementById('progress-print-head');
  if (head) {
    head.innerHTML =
      `<h3 style="margin:0 0 4px">Laporan Progres Belajar — ${tenantNama}</h3>` +
      `<div style="font-size:11.5px;color:#475569">Kelas: ${info.kelas}` +
      (info.nama ? ` · Pencarian: ${info.nama}` : '') +
      ` · Dicetak: ${new Date().toLocaleString('id-ID')} · ${rows.length} siswa</div>`;
  }
  document.body.classList.add('print-progress');
  window.print();
  setTimeout(() => document.body.classList.remove('print-progress'), 1000);
}

async function downloadProgressPng() {
  const rows = progressFilteredRows();
  if (!rows.length) { alert('Tidak ada data untuk diunduh'); return; }
  const info = progressExportInfo();
  const tenantNama = await progressTenantName();

  const scale = 2;
  const W = 1080;
  const rowH = 34;
  const topH = 108;
  const H = topH + 34 + rows.length * rowH + 40;
  const cv = document.createElement('canvas');
  cv.width = W * scale;
  cv.height = H * scale;
  const ctx = cv.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Laporan Progres Belajar', 32, 42);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(tenantNama, 32, 64);
  ctx.fillText(`Kelas: ${info.kelas}${info.nama ? ' · Pencarian: ' + info.nama : ''}`, 32, 82);
  ctx.fillText(`Dicetak: ${new Date().toLocaleString('id-ID')} · ${rows.length} siswa`, 32, 100);

  const cols = [
    { t: 'NIS', x: 32 },
    { t: 'Nama', x: 150 },
    { t: 'Kelas', x: 408 },
    { t: 'Jenjang', x: 496 },
    { t: 'Progres', x: 566 },
    { t: 'Rata-rata', x: 812 },
    { t: 'Ulang', x: 900 }
  ];
  let y = topH + 8;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(24, y - 16, W - 48, 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px system-ui, sans-serif';
  cols.forEach(c => ctx.fillText(c.t, c.x, y + 2));

  ctx.font = '12px system-ui, sans-serif';
  rows.forEach((s, i) => {
    const ry = y + 26 + i * rowH;
    if (i % 2 === 0) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(24, ry - 15, W - 48, rowH);
    }
    const pct = s.total ? Math.round((s.tuntas / s.total) * 100) : 0;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(String(s.nis || '-'), 32, ry);
    ctx.fillText(String(s.nama || '-').slice(0, 36), 150, ry);
    ctx.fillText(String(s.kelas_nama || '-'), 408, ry);
    ctx.fillText(String(s.level || '-'), 496, ry);

    const bx = 566;
    const bw = 140;
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(bx, ry - 8, bw, 8);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(bx, ry - 8, (bw * pct) / 100, 8);
    ctx.fillStyle = '#334155';
    ctx.fillText(`${pct}% (${s.tuntas}/${s.total})`, bx + bw + 10, ry);

    ctx.fillText(s.rata_best === null ? '-' : String(s.rata_best), 812, ry);
    ctx.fillText(`${s.total_attempts || 0}x`, 900, ry);
  });

  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(24, H - 26);
  ctx.lineTo(W - 24, H - 26);
  ctx.stroke();

  const a = document.createElement('a');
  a.download = `progres-belajar-${new Date().toISOString().slice(0, 10)}.png`;
  a.href = cv.toDataURL('image/png');
  a.click();
}

let sessionRows = [];

function sessionDevice(ua) {
  const s = String(ua || '');
  const os = /Android/i.test(s) ? 'Android'
    : /iPhone|iPad|iPod/i.test(s) ? 'iOS'
    : /Windows/i.test(s) ? 'Windows'
    : /Mac OS X/i.test(s) ? 'macOS'
    : /Linux/i.test(s) ? 'Linux' : '-';
  const br = /Edg\//i.test(s) ? 'Edge'
    : /OPR\//i.test(s) ? 'Opera'
    : /Chrome\//i.test(s) ? 'Chrome'
    : /Firefox\//i.test(s) ? 'Firefox'
    : /Safari\//i.test(s) ? 'Safari' : '-';
  return `${br} · ${os}`;
}

function sessionTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function renderSessionRows() {
  const tbody = document.getElementById('sessions-tbody');
  if (!tbody) return;
  const kelasEl = document.getElementById('session-filter-kelas');
  const statusEl = document.getElementById('session-filter-status');
  const namaEl = document.getElementById('session-filter-nama');
  const kelas = kelasEl ? kelasEl.value : '';
  const status = statusEl ? statusEl.value : 'online';
  const q = (namaEl ? namaEl.value : '').trim().toLowerCase();

  const rows = sessionRows.filter(s => {
    if (kelas && (s.kelas_nama || '') !== kelas) return false;
    if (status === 'online' && !s.online) return false;
    if (status === 'offline' && s.online) return false;
    if (q) {
      const hay = `${s.nama || ''} ${s.nis || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="color:var(--text-2)">Tidak ada data</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(s => `
    <tr>
      <td>${s.nama || '-'}${s.nis ? `<div style="font-size:11px;color:var(--text-2)">NIS ${s.nis}</div>` : ''}</td>
      <td>${s.role || '-'}</td>
      <td>${s.kelas_nama || '-'}</td>
      <td><span class="badge ${s.online ? 'badge-success' : 'badge-neutral'}">${s.online ? 'Online' : 'Offline'}</span></td>
      <td>${sessionTime(s.login_at)}</td>
      <td>${sessionTime(s.last_seen_at)}</td>
      <td class="col-extra">${s.ip || '-'}</td>
      <td class="col-extra">${s.lokasi || '-'}</td>
      <td class="col-extra">${sessionDevice(s.ua)}</td>
    </tr>
  `).join('');
}

async function printSessionReport() {
  const kelasEl = document.getElementById('session-filter-kelas');
  const statusEl = document.getElementById('session-filter-status');
  const namaEl = document.getElementById('session-filter-nama');
  const kelas = kelasEl && kelasEl.value ? kelasEl.value : 'Semua Kelas';
  const status = statusEl ? statusEl.value : 'online';
  const nama = namaEl && namaEl.value ? namaEl.value.trim() : '';
  const statusLabel = status === 'online' ? 'Online saja' : status === 'offline' ? 'Offline' : 'Semua status';

  const visible = [...document.querySelectorAll('#sessions-tbody tr')].length;
  if (!visible) { alert('Tidak ada data untuk dicetak'); return; }

  const tenantNama = await progressTenantName();
  const head = document.getElementById('session-print-head');
  if (head) {
    head.innerHTML =
      `<h3 style="margin:0 0 4px">Laporan Login User — ${tenantNama}</h3>` +
      `<div style="font-size:11.5px;color:#475569">Kelas: ${kelas} · Status: ${statusLabel}` +
      (nama ? ` · Pencarian: ${nama}` : '') +
      ` · Dicetak: ${new Date().toLocaleString('id-ID')} · ${visible} baris</div>`;
  }
  document.body.classList.add('print-sessions');
  window.print();
  setTimeout(() => document.body.classList.remove('print-sessions'), 1000);
}

async function renderSessions() {
  const tbody = document.getElementById('sessions-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="color:var(--text-2)">Memuat...</td></tr>';
  try {
    const data = await fetch('/api/admin/sessions', { credentials: 'same-origin' }).then(r => {
      if (!r.ok) throw new Error('Gagal memuat status login');
      return r.json();
    });
    sessionRows = data.sessions || [];
    const sel = document.getElementById('session-filter-kelas');
    if (sel) {
      const prev = sel.value;
      const names = [...new Set(sessionRows.map(r => r.kelas_nama).filter(n => n && n !== '-'))]
        .sort((a, b) => String(a).localeCompare(String(b)));
      sel.innerHTML = '<option value="">Semua Kelas</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
      sel.value = names.includes(prev) ? prev : '';
    }
    renderSessionRows();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

async function renderProgress() {
  const tbody = document.getElementById('progress-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="color:var(--text-2)">Memuat...</td></tr>';
  try {
    const data = await fetch('/api/admin/kurikulum/progress', { credentials: 'same-origin' }).then(r => {
      if (!r.ok) throw new Error('Gagal memuat progres');
      return r.json();
    });
    progressRows = data.students || [];
    const sel = document.getElementById('progress-filter-kelas');
    if (sel) {
      const prev = sel.value;
      const names = [...new Set(progressRows.map(r => r.kelas_nama).filter(n => n && n !== '-'))]
        .sort((a, b) => String(a).localeCompare(String(b)));
      sel.innerHTML = '<option value="">Semua Kelas</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
      sel.value = names.includes(prev) ? prev : '';
    }
    renderProgressRows();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

async function editStudent(id) {  try {
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
  loadAdminSemesterAktif();
  
  try {
    const semFilter = document.getElementById('filter-material-semester')?.value;
    const params = {};
    if (semFilter) params.semester = semFilter;
    const materials = await LMS.getMaterials(params);
    if (!materials.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--text-2)">Belum ada materi</td></tr>';
      return;
    }
    
    tbody.innerHTML = materials.map(m => `
      <tr>
        <td><span class="badge ${m.semester === 2 ? 'badge-warning' : 'badge-primary'}">Sem ${m.semester || 1}</span></td>
        <td><span class="badge badge-neutral">${m.class_nama}</span></td>
        <td>${m.subject_nama}</td>
        <td><strong>${m.judul}</strong></td>
        <td>${m.modul || '-'}</td>
        <td>${m.youtube_id ? '<span class="badge badge-success">🎥 Video</span>' : '-'}</td>
        <td>
          <button class="btn btn-sm" onclick="editMaterial('${m.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteMaterial('${m.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function loadAdminSemesterAktif() {
  try {
    const res = await LMS.getSemesterAktif();
    const sel = document.getElementById('admin-active-semester');
    if (sel && res && res.semester_aktif) {
      sel.value = String(res.semester_aktif);
    }
  } catch (e) {
    console.error('Gagal memuat semester aktif:', e);
  }
}

async function saveAdminSemesterAktif() {
  const sel = document.getElementById('admin-active-semester');
  if (!sel) return;
  const sem = Number(sel.value) || 1;
  try {
    const res = await LMS.setSemesterAktif(sem);
    alert(`Berhasil! Semester aktif sekolah kini diubah menjadi: Semester ${res.semester_aktif} (${res.semester_aktif === 1 ? 'Ganjil' : 'Genap'}).\n\nMateri kurikulum siswa otomatis disesuaikan dengan semester aktif ini.`);
    renderMaterials();
  } catch (err) {
    alert('Gagal mengubah semester aktif: ' + err.message);
  }
}

async function seedKurikulumMateri() {
  if (!confirm('Impor seluruh bab kurikulum (Kelas X, XI, XII) sebagai materi? Bab yang pernah diimpor akan diperbarui.')) return;
  try {
    const r = await LMS.seedKurikulumMaterials();
    renderMaterials();
    renderDashboard();
    const lewat = r.tanpa_kelas.length ? ` Kelas ${r.tanpa_kelas.join(', ')} belum ada sehingga dilewati.` : '';
    alert(`Impor selesai: ${r.created} materi baru, ${r.updated} diperbarui dari mapel ${r.mapel}.${lewat}`);
  } catch (err) {
    alert('Gagal impor: ' + err.message);
  }
}

// ===== WEB ARTICLE WYSIWYG EDITOR =====
let artEditorMode = 'visual'; // 'visual' | 'code'

function initArticleEditor() {
  const visualEl = document.getElementById('art-editor-visual');
  const codeEl = document.getElementById('material-konten');
  const toggleBtn = document.getElementById('btn-toggle-editor-mode');
  const modeLabel = document.getElementById('editor-mode-label');

  if (!visualEl || !codeEl) return;

  // Sync from visual to code on input
  visualEl.addEventListener('input', () => {
    if (artEditorMode === 'visual') {
      codeEl.value = visualEl.innerHTML;
    }
  });

  // Sync from code to visual on input
  codeEl.addEventListener('input', () => {
    if (artEditorMode === 'code') {
      visualEl.innerHTML = codeEl.value;
    }
  });

  // Toggle mode
  toggleBtn?.addEventListener('click', () => {
    if (artEditorMode === 'visual') {
      artEditorMode = 'code';
      codeEl.value = visualEl.innerHTML;
      visualEl.style.display = 'none';
      codeEl.style.display = 'block';
      if (modeLabel) modeLabel.textContent = '👁️ Mode Visual (WYSIWYG)';
      toggleBtn.classList.add('btn-primary');
    } else {
      artEditorMode = 'visual';
      visualEl.innerHTML = codeEl.value;
      codeEl.style.display = 'none';
      visualEl.style.display = 'block';
      if (modeLabel) modeLabel.textContent = '</> Mode HTML';
      toggleBtn.classList.remove('btn-primary');
    }
  });

  // ExecCommand buttons
  document.querySelectorAll('.art-tool-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (artEditorMode !== 'visual') return;
      visualEl.focus();
      document.execCommand(cmd, false, null);
      codeEl.value = visualEl.innerHTML;
    });
  });

  // Font family
  document.getElementById('art-font-name')?.addEventListener('change', (e) => {
    if (artEditorMode !== 'visual') return;
    visualEl.focus();
    if (e.target.value) {
      document.execCommand('fontName', false, e.target.value);
    }
    codeEl.value = visualEl.innerHTML;
  });

  // Font size
  document.getElementById('art-font-size')?.addEventListener('change', (e) => {
    if (artEditorMode !== 'visual') return;
    visualEl.focus();
    if (e.target.value) {
      document.execCommand('fontSize', false, e.target.value);
    }
    codeEl.value = visualEl.innerHTML;
  });

  // Format block
  document.getElementById('art-format-block')?.addEventListener('change', (e) => {
    if (artEditorMode !== 'visual') return;
    visualEl.focus();
    if (e.target.value) {
      document.execCommand('formatBlock', false, '<' + e.target.value + '>');
    }
    codeEl.value = visualEl.innerHTML;
  });

  // Fore color
  document.getElementById('art-fore-color')?.addEventListener('input', (e) => {
    if (artEditorMode !== 'visual') return;
    visualEl.focus();
    document.execCommand('foreColor', false, e.target.value);
    codeEl.value = visualEl.innerHTML;
  });

  // Back color (highlight)
  document.getElementById('art-back-color')?.addEventListener('input', (e) => {
    if (artEditorMode !== 'visual') return;
    visualEl.focus();
    document.execCommand('hiliteColor', false, e.target.value);
    codeEl.value = visualEl.innerHTML;
  });

  // Insert Image dialog
  document.getElementById('btn-art-insert-image')?.addEventListener('click', () => {
    const url = prompt('Masukkan URL Gambar (link https://... atau path gambar lokal):');
    if (!url) return;
    const caption = prompt('Keterangan / Caption Gambar (opsional):', '') || '';
    const html = `<figure style="margin:16px 0;text-align:center"><img src="${url}" alt="${caption}" style="max-width:100%;border-radius:10px;border:1px solid #cbd5e1;box-shadow:0 2px 6px rgba(0,0,0,0.06)">${caption ? `<figcaption style="font-size:12px;color:#64748b;margin-top:6px;font-style:italic">${caption}</figcaption>` : ''}</figure><p><br></p>`;
    insertHtmlToEditor(html);
  });

  // Insert YouTube Video dialog
  document.getElementById('btn-art-insert-video')?.addEventListener('click', () => {
    const input = prompt('Masukkan URL Video YouTube atau Video ID (contoh: 2vK8s_aX49c atau https://www.youtube.com/watch?v=...):');
    if (!input) return;
    let ytId = input.trim();
    const match = ytId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) ytId = match[1];
    const title = prompt('Judul Video (opsional):', 'Video Pembelajaran Geografi') || 'Video Pembelajaran Geografi';
    const html = `<div class="bl-media-box" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#000;margin:16px 0"><div style="background:#0f172a;color:#fff;padding:8px 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px">🎥 ${title}</div><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden"><iframe src="https://www.youtube.com/embed/${ytId}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe></div></div><p><br></p>`;
    insertHtmlToEditor(html);
  });

  // Insert Table dialog
  document.getElementById('btn-art-insert-table')?.addEventListener('click', () => {
    const rows = parseInt(prompt('Jumlah Baris Data (contoh: 3):', '3') || '3', 10);
    const cols = parseInt(prompt('Jumlah Kolom (contoh: 3):', '3') || '3', 10);
    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) return;

    let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:14px 0"><thead><tr>';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th style="border:1px solid #cbd5e1;padding:8px 12px;background:#f1f5f9">Kolom ${c}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r <= rows; r++) {
      tableHtml += '<tr>';
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td style="border:1px solid #cbd5e1;padding:8px 12px">Baris ${r}, Data ${c}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';
    insertHtmlToEditor(tableHtml);
  });

  // Insert Callout box dialog
  document.getElementById('btn-art-insert-callout')?.addEventListener('click', () => {
    const choice = prompt(
      'Pilih Jenis Kotak Khusus:\n' +
      '1 = 📌 Kotak Studi Kasus Terkini (Hijau)\n' +
      '2 = 💡 Kotak Konsep & Hakikat (Biru)\n' +
      '3 = 📜 Kotak Sejarah & Filsafat (Kuning/Oranye)\n' +
      '4 = 🎨 Kotak Pembelajaran Berdiferensiasi (Ungu)\n' +
      '5 = 👤 Kartu Profil Tokoh Ilmuwan',
      '1'
    );
    if (!choice) return;

    let calloutHtml = '';
    if (choice === '1') {
      calloutHtml = '<div class="bl-callout case" style="border-left:4px solid #0d9488;background:#f0fdfa;border-radius:0 10px 10px 0;padding:14px 16px;margin:16px 0"><h4 style="margin:0 0 6px;color:#0f766e">📌 Studi Kasus Terkini: [Tuliskan Judul Kasus]</h4><p style="margin:0;font-size:13px;line-height:1.6">Tuliskan uraian peristiwa fenomena geosfer terkini, latar belakang masalah, dan analisis keruangan...</p></div><p><br></p>';
    } else if (choice === '2') {
      calloutHtml = '<div class="bl-callout concept" style="border-left:4px solid #2563eb;background:#eff6ff;border-radius:0 10px 10px 0;padding:14px 16px;margin:16px 0"><h4 style="margin:0 0 6px;color:#1d4ed8">💡 Konsep Esensial Geografi: [Nama Konsep]</h4><p style="margin:0;font-size:13px;line-height:1.6">Tuliskan definisi esensial, indikator keruangan, dan rumus/pedoman analisis konsep ini...</p></div><p><br></p>';
    } else if (choice === '3') {
      calloutHtml = '<div class="bl-callout history" style="border-left:4px solid #d97706;background:#fffbeb;border-radius:0 10px 10px 0;padding:14px 16px;margin:16px 0"><h4 style="margin:0 0 6px;color:#b45309">📜 Catatan Sejarah & Filsafat Geografi</h4><p style="margin:0;font-size:13px;line-height:1.6">Tuliskan sejarah penemuan, perdebatan epistemologi aliran determinisme vs posibilisme...</p></div><p><br></p>';
    } else if (choice === '4') {
      calloutHtml = '<div class="bl-callout diff" style="border-left:4px solid #7c3aed;background:#f5f3ff;border-radius:0 10px 10px 0;padding:14px 16px;margin:16px 0"><h4 style="margin:0 0 6px;color:#6d28d9">🎨 Aktivitas Pembelajaran Berdiferensiasi</h4><p style="margin:0 0 6px;font-size:13px"><strong>Pilihan Produk Belajar:</strong></p><ul style="margin:0;padding-left:18px;font-size:13px"><li><strong>Visual:</strong> Buatlah infografis/peta tematik.</li><li><strong>Auditori:</strong> Rekam rekaman suara/podcast analisis 5W+1H.</li><li><strong>Kinestetik:</strong> Lakukan observasi lapangan langsung di lingkungan sekitar.</li></ul></div><p><br></p>';
    } else if (choice === '5') {
      const name = prompt('Nama Tokoh Ilmuwan:', 'Alexander von Humboldt') || 'Alexander von Humboldt';
      const era = prompt('Era / Periode (contoh: Abad 18–19 M, Jerman):', 'Abad 18–19 M, Jerman') || 'Abad 18–19 M, Jerman';
      const role = prompt('Gelar / Peran Tokoh:', 'Bapak Geografi Saintifik Modern') || 'Bapak Geografi Saintifik Modern';
      calloutHtml = `<div class="bl-scientist-card" style="display:flex;gap:14px;align-items:center;padding:14px 16px;border:1px solid #cbd5e1;border-radius:12px;background:#ffffff;margin:16px 0;box-shadow:0 2px 6px rgba(0,0,0,0.04)"><div style="width:52px;height:52px;border-radius:50%;background:#0d9488;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none">👤</div><div><h4 style="margin:0;font-size:14px;color:#0f172a">${name} <small style="font-size:11.5px;color:#64748b;font-weight:normal">(${era})</small></h4><span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#e0f2fe;color:#0369a1;margin:4px 0">${role}</span><p style="margin:4px 0 0;font-size:12.5px;color:#475569">Tuliskan karya monumental dan sumbangsih pemikiran tokoh geografi ini...</p></div></div><p><br></p>`;
    }
    if (calloutHtml) insertHtmlToEditor(calloutHtml);
  });
}

function insertHtmlToEditor(html) {
  const visualEl = document.getElementById('art-editor-visual');
  const codeEl = document.getElementById('material-konten');
  if (artEditorMode === 'visual' && visualEl) {
    visualEl.focus();
    document.execCommand('insertHTML', false, html);
    if (codeEl) codeEl.value = visualEl.innerHTML;
  } else if (codeEl) {
    codeEl.value += '\n' + html;
    if (visualEl) visualEl.innerHTML = codeEl.value;
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
    
    const visualEl = document.getElementById('art-editor-visual');
    const codeEl = document.getElementById('material-konten');
    const modeLabel = document.getElementById('editor-mode-label');
    const toggleBtn = document.getElementById('btn-toggle-editor-mode');

    // Default to visual mode
    artEditorMode = 'visual';
    if (visualEl) visualEl.style.display = 'block';
    if (codeEl) codeEl.style.display = 'none';
    if (modeLabel) modeLabel.textContent = '</> Mode HTML';
    if (toggleBtn) toggleBtn.classList.remove('btn-primary');

    if (material) {
      document.getElementById('material-id').value = material.id;
      subjectSel.value = material.subject_id;
      classSel.value = material.class_id;
      document.getElementById('material-semester').value = material.semester || 1;
      document.getElementById('material-judul').value = material.judul;
      document.getElementById('material-konten').value = material.konten || '';
      if (visualEl) visualEl.innerHTML = material.konten || '';
      document.getElementById('material-youtube').value = material.youtube_id || '';
      document.getElementById('material-image').value = material.image || '';
      document.getElementById('material-modul').value = material.modul || '';
      document.getElementById('material-tipe').value = material.tipe || 'materi';
    } else {
      document.getElementById('material-id').value = '';
      document.getElementById('material-semester').value = '1';
      if (visualEl) visualEl.innerHTML = '';
      if (codeEl) codeEl.value = '';
    }
    
    modal.classList.add('show');
  } catch (err) {
    alert('Gagal load data: ' + err.message);
  }
}

async function saveMaterial() {
  const visualEl = document.getElementById('art-editor-visual');
  const codeEl = document.getElementById('material-konten');
  if (artEditorMode === 'visual' && visualEl) {
    codeEl.value = visualEl.innerHTML;
  }

  const id = document.getElementById('material-id').value;
  const data = {
    judul: document.getElementById('material-judul').value.trim(),
    konten: codeEl.value.trim(),
    subject_id: document.getElementById('material-subject').value,
    class_id: document.getElementById('material-class').value,
    semester: Number(document.getElementById('material-semester').value) || 1,
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
      document.getElementById('question-image').value = question.image || question.gambar || '';
      document.getElementById('question-youtube').value = question.youtube_id || '';
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
      document.getElementById('question-image').value = '';
      document.getElementById('question-youtube').value = '';
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
    image: document.getElementById('question-image').value.trim(),
    youtube_id: document.getElementById('question-youtube').value.trim(),
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
let gradesCache = [];

async function renderGrades() {
  const tbody = document.getElementById('grades-tbody');
  if (!tbody) return;
  
  try {
    const [grades, students] = await Promise.all([LMS.getGrades(), LMS.getStudents()]);
    const byId = new Map(students.map(s => [s.id, s]));
    gradesCache = grades.map(g => {
      const s = byId.get(g.student_id);
      return { ...g, student_nis: s ? s.nis : '', student_nisn: s ? s.nisn : '' };
    });
    renderGradeClassFilter();
    renderGradeRows();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

function renderGradeClassFilter() {
  const sel = document.getElementById('grade-filter-kelas');
  if (!sel) return;
  const current = sel.value;
  const names = [...new Set(gradesCache.map(g => g.class_nama).filter(n => n && n !== '-'))]
    .sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  sel.innerHTML = '<option value="">Semua Kelas</option>' +
    names.map(n => `<option value="${n}">${n}</option>`).join('');
  sel.value = names.includes(current) ? current : '';
}

function filterGrades() {
  const q = (document.getElementById('grade-filter-nama')?.value || '').trim().toLowerCase();
  const kelas = document.getElementById('grade-filter-kelas')?.value || '';
  return gradesCache.filter(g => {
    if (kelas && g.class_nama !== kelas) return false;
    if (!q) return true;
    return [g.student_nama, g.student_nis, g.student_nisn, g.subject_nama]
      .some(v => String(v || '').toLowerCase().includes(q));
  });
}

function renderGradeRows() {
  const tbody = document.getElementById('grades-tbody');
  if (!tbody) return;
  
  const grades = filterGrades();
  if (!grades.length) {
    const msg = gradesCache.length ? 'Tidak ada nilai yang cocok dengan filter' : 'Belum ada nilai';
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-2)">${msg}</td></tr>`;
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
}

function resetGradeFilter() {
  const nama = document.getElementById('grade-filter-nama');
  const kelas = document.getElementById('grade-filter-kelas');
  if (nama) nama.value = '';
  if (kelas) kelas.value = '';
  renderGradeRows();
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
  initArticleEditor();
  
  // Subjects
  document.getElementById('btn-add-subject')?.addEventListener('click', () => openSubjectModal());
  document.getElementById('btn-save-subject')?.addEventListener('click', saveSubject);
  
  // Classes
  document.getElementById('btn-add-class')?.addEventListener('click', () => openClassModal());
  document.getElementById('btn-save-class')?.addEventListener('click', saveClass);
  
  // Students
  document.getElementById('btn-add-student')?.addEventListener('click', () => openStudentModal());
  document.getElementById('btn-save-student')?.addEventListener('click', saveStudent);
  document.getElementById('student-filter-nama')?.addEventListener('input', renderStudentRows);
  document.getElementById('student-filter-kelas')?.addEventListener('change', renderStudentRows);
  document.getElementById('btn-student-filter-reset')?.addEventListener('click', resetStudentFilter);
  document.getElementById('btn-student-template')?.addEventListener('click', downloadStudentTemplate);  document.getElementById('btn-student-import')?.addEventListener('click', () => {
    document.getElementById('student-import-file').click();
  });
  document.getElementById('btn-progress-refresh')?.addEventListener('click', renderProgress);
  document.getElementById('btn-progress-print')?.addEventListener('click', printProgressReport);
  document.getElementById('btn-progress-png')?.addEventListener('click', downloadProgressPng);
  document.getElementById('progress-filter-kelas')?.addEventListener('change', renderProgressRows);
  document.getElementById('progress-filter-nama')?.addEventListener('input', renderProgressRows);
  document.getElementById('btn-sessions-refresh')?.addEventListener('click', renderSessions);
  document.getElementById('btn-sessions-print')?.addEventListener('click', printSessionReport);
  document.getElementById('session-filter-kelas')?.addEventListener('change', renderSessionRows);
  document.getElementById('session-filter-status')?.addEventListener('change', renderSessionRows);
  document.getElementById('session-filter-nama')?.addEventListener('input', renderSessionRows);
  document.getElementById('student-import-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importStudentFile(file);
    e.target.value = '';
  });
  
  // Materials
  document.getElementById('btn-add-material')?.addEventListener('click', () => openMaterialModal());
  document.getElementById('btn-seed-kurikulum')?.addEventListener('click', seedKurikulumMateri);
  document.getElementById('btn-save-material')?.addEventListener('click', saveMaterial);
  document.getElementById('btn-save-semester-aktif')?.addEventListener('click', saveAdminSemesterAktif);
  document.getElementById('filter-material-semester')?.addEventListener('change', renderMaterials);
  
  // Questions
  document.getElementById('btn-add-question')?.addEventListener('click', () => openQuestionModal());
  document.getElementById('btn-save-question')?.addEventListener('click', saveQuestion);
  
  // Exams
  document.getElementById('btn-add-exam')?.addEventListener('click', openExamModal);
  document.getElementById('btn-save-exam')?.addEventListener('click', saveExam);
  
  // Grades
  document.getElementById('btn-add-grade')?.addEventListener('click', openGradeModal);
  document.getElementById('btn-save-grade')?.addEventListener('click', saveGrade);
  document.getElementById('grade-filter-nama')?.addEventListener('input', renderGradeRows);
  document.getElementById('grade-filter-kelas')?.addEventListener('change', renderGradeRows);
  document.getElementById('btn-grade-filter-reset')?.addEventListener('click', resetGradeFilter);
  
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

// ===== KURIKULUM (editor materi & soal pembelajaran) =====
let kurLevel = 'X';

function kurEsc(s) {
  return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function kurFetch(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Gagal memuat data');
  return data;
}

async function renderKurikulum() {
  const tbody = document.getElementById('kur-tbody');
  if (!tbody) return;
  const sel = document.getElementById('kur-level');
  if (sel) kurLevel = sel.value;
  const box = document.getElementById('kur-editor');
  if (box) box.classList.add('hidden');
  tbody.innerHTML = '<tr><td colspan="4" class="text-center">Memuat…</td></tr>';
  try {
    const data = await kurFetch('/api/kurikulum?kelas=' + encodeURIComponent(kurLevel));
    const babs = data.babs || [];
    tbody.innerHTML = babs.length
      ? babs.map(b => `<tr>
          <td>${b.urutan}</td>
          <td>${kurEsc(b.judul)}<div class="kur-sub">${b.jumlah_soal} soal · ${b.tuntas} tuntas</div></td>
          <td>${kurEsc(kurLevel)}</td>
          <td><button class="btn btn-sm" data-kur-edit="${kurEsc(b.id)}">Edit</button></td>
        </tr>`).join('')
      : '<tr><td colspan="4" class="text-center">Belum ada materi untuk kelas ini.</td></tr>';
    tbody.querySelectorAll('[data-kur-edit]').forEach(btn => btn.addEventListener('click', () => openKurEditor(btn.dataset.kurEdit)));
    document.getElementById('btn-kur-muat').onclick = renderKurikulum;
    if (sel) sel.onchange = renderKurikulum;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${kurEsc(err.message)}</td></tr>`;
  }
}

function rtBar() {
  return `<div class="rt-bar">
    <button type="button" data-cmd="bold" title="Tebal"><b>B</b></button>
    <button type="button" data-cmd="italic" title="Miring"><i>I</i></button>
    <button type="button" data-cmd="underline" title="Garis bawah"><u>U</u></button>
    <button type="button" data-block="H2">H2</button>
    <button type="button" data-block="H3">H3</button>
    <button type="button" data-block="P">¶</button>
    <button type="button" data-cmd="insertUnorderedList">•</button>
    <button type="button" data-cmd="insertOrderedList">1.</button>
    <button type="button" data-cmd="justifyLeft">Kiri</button>
    <button type="button" data-cmd="justifyCenter">Tengah</button>
    <button type="button" data-link="1">Link</button>
    <button type="button" data-img="1">Gambar</button>
    <button type="button" data-cmd="removeFormat">Bersihkan</button>
    <select data-font="1"><option value="">Font</option><option>Inter</option><option>Georgia</option><option>Merriweather</option><option>system-ui</option></select>
    <select data-size="1"><option value="">Ukuran</option><option value="2">Kecil</option><option value="3">Normal</option><option value="5">Besar</option><option value="6">Judul</option></select>
  </div>`;
}

function kurMateriItem(m, i) {
  return `<div class="kur-item" data-idx="${i}">
    <div class="kur-grid">
      <label>Judul bagian<input class="kur-m-judul" value="${kurEsc(m.judul)}"></label>
      <label>URL gambar<input class="kur-m-gambar" placeholder="https://…" value="${kurEsc(m.gambar || '')}"></label>
      <label class="wide">Keterangan gambar<input class="kur-m-caption" value="${kurEsc(m.caption || '')}"></label>
    </div>
    ${rtBar()}
    <div class="rt-editor" contenteditable="true" spellcheck="false">${m.html || ''}</div>
    <button type="button" class="btn btn-sm kur-del">Hapus bagian</button>
  </div>`;
}

function kurSoalItem(s, i) {
  const t = s.tipe;
  const isOpsi = t === 'pgm' || t === 'pg_singkat' || t === 'pg_kompleks' || t === 'benar_salah';
  const isPair = t === 'menjodohkan';
  const list = isOpsi ? (s.opsi || s.pernyataan || []).join('\n') : '';
  return `<div class="kur-item" data-idx="${i}" data-tipe="${t}" data-id="${kurEsc(s.id)}">
    <div class="kur-item-head"><b>Soal ${i + 1}</b><span class="kur-sub">${kurEsc(t)}</span></div>
    <div class="kur-grid">
      <label>Level<input class="k-s-level" value="${kurEsc(s.level || 'C4')}"></label>
      <label>Jenis stimulus<input class="k-s-jenis" value="${kurEsc((s.stimulus && s.stimulus.jenis) || 'teks')}"></label>
      <label>Literasi<input class="k-s-literasi" value="${kurEsc(s.literasi || '')}"></label>
      <label>Numerasi<input class="k-s-numerasi" value="${kurEsc(s.numerasi || '')}"></label>
      <label>Judul stimulus<input class="k-s-stimjudul" value="${kurEsc((s.stimulus && s.stimulus.judul) || '')}"></label>
      <label>URL gambar stimulus<input class="k-s-gambar" placeholder="https://…" value="${kurEsc((s.stimulus && s.stimulus.gambar) || '')}"></label>
      <label class="wide">Isi stimulus (HTML ringan)<textarea class="k-s-stimisi" rows="3">${kurEsc((s.stimulus && s.stimulus.isi) || '')}</textarea></label>
      <label>Sumber<input class="k-s-sumber" value="${kurEsc((s.stimulus && s.stimulus.sumber) || '')}"></label>
      <label class="wide">Pertanyaan<textarea class="k-s-pertanyaan" rows="2">${kurEsc(s.pertanyaan)}</textarea></label>
      ${isOpsi ? `<label class="wide">Opsi / pernyataan (satu per baris)<textarea class="k-s-opsi" rows="5">${kurEsc(list)}</textarea></label>` : ''}
      ${isPair ? `<label>Kiri (satu per baris)<textarea class="k-s-kiri" rows="4">${kurEsc((s.kiri || []).join('\n'))}</textarea></label>
      <label>Kanan (satu per baris)<textarea class="k-s-kanan" rows="4">${kurEsc((s.kanan || []).join('\n'))}</textarea></label>` : ''}
      <label>Kunci (pisah koma: 0 / B,S / 2,0,1)<input class="k-s-kunci" value="${kurEsc((s.kunci || []).join(','))}"></label>
      <label class="wide">Pembahasan<textarea class="k-s-pembahasan" rows="2">${kurEsc(s.pembahasan || '')}</textarea></label>
    </div>
  </div>`;
}

function kurBindEditor(box) {
  box.querySelectorAll('.rt-bar').forEach(bar => {
    const editor = bar.parentElement.querySelector('.rt-editor');
    if (!editor) return;
    const run = fn => { editor.focus(); fn(); };
    bar.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.preventDefault();
        if (btn.dataset.cmd) run(() => document.execCommand(btn.dataset.cmd, false, null));
        if (btn.dataset.block) run(() => document.execCommand('formatBlock', false, '<' + btn.dataset.block + '>'));
        if (btn.dataset.link) {
          const url = prompt('URL tautan:');
          if (url) run(() => document.execCommand('createLink', false, url));
        }
        if (btn.dataset.img) {
          const url = prompt('URL gambar:');
          if (url) run(() => document.execCommand('insertHTML', false, '<figure><img src="' + url + '" alt=""><figcaption>Keterangan gambar</figcaption></figure>'));
        }
      });
    });
    const font = bar.querySelector('[data-font]');
    if (font) font.addEventListener('change', () => run(() => document.execCommand('fontName', false, font.value)));
    const size = bar.querySelector('[data-size]');
    if (size) size.addEventListener('change', () => run(() => document.execCommand('fontSize', false, size.value)));
  });

  box.querySelectorAll('.kur-del').forEach(btn => btn.addEventListener('click', () => {
    btn.closest('.kur-item').remove();
  }));

  const addBtn = box.querySelector('#kur-add-materi');
  if (addBtn) addBtn.onclick = () => {
    const list = box.querySelector('#kur-materi');
    const idx = list.querySelectorAll('.kur-item').length;
    list.insertAdjacentHTML('beforeend', kurMateriItem({ judul: '', html: '', gambar: '', caption: '' }, idx));
    kurBindEditor(box);
  };

  const closeBtn = box.querySelector('#kur-tutup');
  if (closeBtn) closeBtn.onclick = () => box.classList.add('hidden');
  const cancelBtn = box.querySelector('#kur-batal');
  if (cancelBtn) cancelBtn.onclick = () => box.classList.add('hidden');
  const saveBtn = box.querySelector('#kur-simpan');
  if (saveBtn) saveBtn.onclick = () => kurSave(box);
}

async function openKurEditor(id) {
  const box = document.getElementById('kur-editor');
  if (!box) return;
  box.classList.remove('hidden');
  box.innerHTML = '<p class="kur-sub">Memuat…</p>';
  try {
    const b = await kurFetch('/api/admin/kurikulum/' + encodeURIComponent(id));
    box.dataset.id = id;
    box.innerHTML = `
      <div class="panel-head"><h3>Edit materi: ${kurEsc(b.judul)}</h3><button class="btn btn-sm" id="kur-tutup">Tutup</button></div>
      <div class="kur-grid">
        <label>Judul<input id="kur-judul" value="${kurEsc(b.judul)}"></label>
        <label>Estimasi<input id="kur-estimasi" value="${kurEsc(b.estimasi || '')}"></label>
        <label class="wide">Ringkasan<textarea id="kur-ringkasan" rows="2">${kurEsc(b.ringkasan)}</textarea></label>
        <label class="wide">Capaian pembelajaran<textarea id="kur-cp" rows="2">${kurEsc(b.cp || '')}</textarea></label>
        <label class="wide">Tujuan (satu per baris)<textarea id="kur-tujuan" rows="4">${kurEsc((b.tujuan || []).join('\n'))}</textarea></label>
      </div>
      <h4 class="kur-h">Bagian materi</h4>
      <div id="kur-materi">${(b.materi || []).map(kurMateriItem).join('')}</div>
      <button type="button" class="btn btn-sm" id="kur-add-materi">+ Tambah bagian</button>
      <h4 class="kur-h">Glosarium (istilah|arti per baris)</h4>
      <textarea id="kur-glos" rows="4">${kurEsc((b.glosarium || []).map(g => g.istilah + '|' + g.arti).join('\n'))}</textarea>
      <h4 class="kur-h">Soal evaluasi</h4>
      <div id="kur-soal">${(b.soal || []).map(kurSoalItem).join('')}</div>
      <div class="list-toolbar" style="justify-content:flex-end;margin-top:12px">
        <button class="btn" id="kur-batal">Batal</button>
        <button class="btn btn-primary" id="kur-simpan">Simpan</button>
      </div>`;
    kurBindEditor(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    box.innerHTML = `<p class="kur-sub">Error: ${kurEsc(err.message)}</p>`;
  }
}

function kurCollect(box) {
  const materi = [...box.querySelectorAll('#kur-materi .kur-item')].map(item => ({
    judul: item.querySelector('.kur-m-judul').value.trim(),
    gambar: item.querySelector('.kur-m-gambar').value.trim(),
    caption: item.querySelector('.kur-m-caption').value.trim(),
    html: item.querySelector('.rt-editor').innerHTML
  })).filter(m => m.judul || m.html);

  const glosarium = box.querySelector('#kur-glos').value.split('\n')
    .map(line => line.split('|'))
    .filter(parts => parts[0] && parts[1])
    .map(parts => ({ istilah: parts[0].trim(), arti: parts[1].trim() }));

  const soal = [...box.querySelectorAll('#kur-soal .kur-item')].map(item => {
    const tipe = item.dataset.tipe;
    const val = sel => { const el = item.querySelector(sel); return el ? el.value : ''; };
    const lines = sel => val(sel).split('\n').map(s => s.trim()).filter(Boolean);
    const out = {
      id: item.dataset.id,
      tipe: tipe,
      level: val('.k-s-level') || 'C4',
      literasi: val('.k-s-literasi'),
      numerasi: val('.k-s-numerasi'),
      stimulus: {
        jenis: val('.k-s-jenis') || 'teks',
        judul: val('.k-s-stimjudul'),
        isi: val('.k-s-stimisi'),
        gambar: val('.k-s-gambar'),
        sumber: val('.k-s-sumber')
      },
      pertanyaan: val('.k-s-pertanyaan'),
      pembahasan: val('.k-s-pembahasan')
    };
    if (tipe === 'pgm' || tipe === 'pg_singkat' || tipe === 'pg_kompleks') out.opsi = lines('.k-s-opsi');
    if (tipe === 'benar_salah') out.pernyataan = lines('.k-s-opsi');
    if (tipe === 'menjodohkan') { out.kiri = lines('.k-s-kiri'); out.kanan = lines('.k-s-kanan'); }
    const raw = val('.k-s-kunci').split(',').map(s => s.trim()).filter(Boolean);
    out.kunci = tipe === 'benar_salah'
      ? raw.map(k => (k.toUpperCase() === 'B' ? 'B' : 'S'))
      : raw.map(Number).filter(n => !Number.isNaN(n));
    return out;
  });

  return {
    judul: box.querySelector('#kur-judul').value.trim(),
    ringkasan: box.querySelector('#kur-ringkasan').value.trim(),
    cp: box.querySelector('#kur-cp').value.trim(),
    estimasi: box.querySelector('#kur-estimasi').value.trim(),
    tujuan: box.querySelector('#kur-tujuan').value.split('\n').map(s => s.trim()).filter(Boolean),
    materi: materi,
    glosarium: glosarium,
    soal: soal
  };
}

async function kurSave(box) {
  const btn = box.querySelector('#kur-simpan');
  btn.disabled = true;
  try {
    await kurFetch('/api/admin/kurikulum/' + encodeURIComponent(box.dataset.id), {
      method: 'PUT',
      body: JSON.stringify(kurCollect(box))
    });
    btn.disabled = false;
    alert('Materi kurikulum tersimpan.');
    renderKurikulum();
  } catch (err) {
    btn.disabled = false;
    alert('Gagal menyimpan: ' + err.message);
  }
}
