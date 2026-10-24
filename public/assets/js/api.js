// ===== LMS MULTI-TENANT API CLIENT =====
const API_BASE = '/api';

const LMS = (() => {
  let currentUser = null;
  let currentTenant = null;

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error' }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    return res.json();
  }

  async function checkAuth() {
    try {
      const user = await api('/me');
      currentUser = user;
      return user;
    } catch {
      return null;
    }
  }

  async function login(email, password) {
    const user = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    currentUser = user;
    currentTenant = user.tenant_id;
    return user;
  }

  async function logout() {
    await api('/logout', { method: 'POST' });
    currentUser = null;
    currentTenant = null;
  }

  async function selectTenant(tenantId) {
    await api('/tenants/select', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId })
    });
    currentTenant = tenantId;
  }

  // Tenants
  async function getTenants() { return api('/tenants'); }
  async function createTenant(data) { return api('/tenants', { method: 'POST', body: JSON.stringify(data) }); }

  // Subjects
  async function getSubjects() { return api('/subjects'); }
  async function createSubject(data) { return api('/subjects', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateSubject(id, data) { return api(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function deleteSubject(id) { return api(`/subjects/${id}`, { method: 'DELETE' }); }

  // Classes
  async function getClasses() { return api('/classes'); }
  async function createClass(data) { return api('/classes', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateClass(id, data) { return api(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function deleteClass(id) { return api(`/classes/${id}`, { method: 'DELETE' }); }

  // Students
  async function getStudents() { return api('/students'); }
  async function createStudent(data) { return api('/students', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateStudent(id, data) { return api(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function importStudents(students) { return api('/students/import', { method: 'POST', body: JSON.stringify({ students }) }); }
  async function deleteStudent(id) { return api(`/students/${id}`, { method: 'DELETE' }); }

  // Materials
  async function getMaterials(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/materials${qs ? '?' + qs : ''}`);
  }
  async function createMaterial(data) { return api('/materials', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateMaterial(id, data) { return api(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function deleteMaterial(id) { return api(`/materials/${id}`, { method: 'DELETE' }); }

  // Questions
  async function getQuestions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/questions${qs ? '?' + qs : ''}`);
  }
  async function createQuestion(data) { return api('/questions', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateQuestion(id, data) { return api(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function deleteQuestion(id) { return api(`/questions/${id}`, { method: 'DELETE' }); }

  // Exams
  async function getExams() { return api('/exams'); }
  async function createExam(data) { return api('/exams', { method: 'POST', body: JSON.stringify(data) }); }
  async function deleteExam(id) { return api(`/exams/${id}`, { method: 'DELETE' }); }

  // Grades
  async function getGrades(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/grades${qs ? '?' + qs : ''}`);
  }
  async function createGrade(data) { return api('/grades', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateGrade(id, data) { return api(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function deleteGrade(id) { return api(`/grades/${id}`, { method: 'DELETE' }); }

  // Dashboard
  async function getDashboard() { return api('/dashboard'); }
  async function seedData() { return api('/seed', { method: 'POST' }); }

  // Student login
  async function studentLogin(username, password) {
    return api('/student/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  // Attendance
  async function getAttendance() { return api('/attendance'); }
  async function createAttendance(data) { return api('/attendance', { method: 'POST', body: JSON.stringify(data) }); }
  async function deleteAttendance(id) { return api(`/attendance/${id}`, { method: 'DELETE' }); }

  // Assignments
  async function getAssignments() { return api('/assignments'); }
  async function createAssignment(data) { return api('/assignments', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateAssignment(id, data) { return api(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function deleteAssignment(id) { return api(`/assignments/${id}`, { method: 'DELETE' }); }

  // Schedules
  async function getSchedules() { return api('/schedules'); }
  async function createSchedule(data) { return api('/schedules', { method: 'POST', body: JSON.stringify(data) }); }
  async function updateSchedule(id, data) { return api(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async function deleteSchedule(id) { return api(`/schedules/${id}`, { method: 'DELETE' }); }

  return {
    currentUser: () => currentUser,
    setCurrentUser: (u) => { currentUser = u; },
    getCurrentTenant: () => currentTenant,
    setCurrentTenant: (t) => { currentTenant = t; },
    checkAuth, login, logout, selectTenant,
    getTenants, createTenant,
    getSubjects, createSubject, updateSubject, deleteSubject,
    getClasses, createClass, updateClass, deleteClass,
    getStudents, createStudent, updateStudent, importStudents, deleteStudent,
    getMaterials, createMaterial, updateMaterial, deleteMaterial,
    getQuestions, createQuestion, updateQuestion, deleteQuestion,
    getExams, createExam, deleteExam,
    getGrades, createGrade, updateGrade, deleteGrade,
    getDashboard, seedData
  };
})();
