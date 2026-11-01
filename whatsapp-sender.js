const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');

const SESSION_ROOT = process.env.WA_SESSION_DIR || path.join(__dirname, 'data', 'whatsapp-sessions');
const TIME_ZONE = process.env.WA_TIME_ZONE || 'Asia/Jakarta';
const connections = new Map();
let baileysModulePromise;
let schedulerTimer;
let schedulerBusy = false;

function baileys() {
  if (!baileysModulePromise) baileysModulePromise = import('@whiskeysockets/baileys');
  return baileysModulePromise;
}

function tenantSessionPath(tenantId) {
  if (!/^[\w-]+$/.test(String(tenantId || ''))) throw new Error('ID tenant tidak valid');
  return path.join(SESSION_ROOT, String(tenantId));
}

async function resetSession(tenantId) {
  try {
    await fs.rm(tenantSessionPath(tenantId), { recursive: true, force: true });
  } catch (error) {
    console.error(`WhatsApp tenant ${tenantId}: gagal menghapus sesi lama:`, error);
  }
}

function publicStatus(tenantId) {
  const connection = connections.get(tenantId);
  return {
    status: connection ? connection.status : 'disconnected',
    phone: connection ? connection.phone : '',
    qr: connection ? connection.qr : '',
    error: connection ? connection.error : '',
    groups: connection ? connection.groups : []
  };
}

async function refreshGroups(tenantId) {
  const connection = connections.get(tenantId);
  if (!connection || connection.status !== 'connected' || !connection.socket) return [];
  const groups = await connection.socket.groupFetchAllParticipating();
  connection.groups = Object.values(groups || {})
    .map(group => ({ id: group.id, subject: group.subject || 'Grup WhatsApp' }))
    .filter(group => typeof group.id === 'string' && group.id.endsWith('@g.us'))
    .sort((a, b) => a.subject.localeCompare(b.subject, 'id'));
  return connection.groups;
}

async function connectTenant(tenantId) {
  const existing = connections.get(tenantId);
  if (existing && ['connecting', 'connected', 'qr'].includes(existing.status)) return publicStatus(tenantId);

  // Satu socket per tenant: tutup socket lama sebelum membuat yang baru agar
  // WhatsApp tidak menganggap sesi ganda dan memaksa keluar.
  if (existing && existing.socket) {
    try { existing.socket.end?.(undefined); } catch {}
    existing.socket = null;
  }

  const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = await baileys();
  const authPath = tenantSessionPath(tenantId);
  if (existing && existing.status === 'logged_out') await resetSession(tenantId);
  await fs.mkdir(authPath, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') await fs.chmod(authPath, 0o700);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const connection = {
    status: 'connecting',
    qr: '',
    phone: '',
    groups: [],
    error: '',
    socket: null,
    enabled: true,
    reconnectTimer: null
  };
  connections.set(tenantId, connection);

  const socket = makeWASocket({
    auth: state,
    browser: Browsers.macOS('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false
  });
  connection.socket = socket;
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', update => {
    if (update.qr) {
      connection.status = 'qr';
      QRCode.toDataURL(update.qr).then(dataUrl => {
        if (connections.get(tenantId) === connection) connection.qr = dataUrl;
      }).catch(error => {
        connection.status = 'error';
        connection.error = error.message || 'QR tidak dapat dibuat';
        console.error(`WhatsApp tenant ${tenantId}: gagal membuat QR:`, error);
      });
    }
    if (update.connection === 'open') {
      connection.status = 'connected';
      connection.qr = '';
      connection.error = '';
      connection.phone = state.creds.me?.id?.split(':')[0] || '';
      refreshGroups(tenantId).catch(error => {
        connection.error = error.message || 'Gagal memuat grup WhatsApp';
        console.error(`WhatsApp tenant ${tenantId}: gagal memuat grup:`, error);
      });
    }
    if (update.connection === 'close') {
      const code = update.lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      connection.socket = null;
      connection.qr = '';
      connection.status = loggedOut ? 'logged_out' : 'disconnected';
      connection.error = loggedOut ? 'Perangkat telah keluar. Hubungkan ulang dengan QR.' : 'Koneksi terputus.';
      if (loggedOut) connection.enabled = false;
      if (connection.enabled && !loggedOut) {
        clearTimeout(connection.reconnectTimer);
        connection.reconnectTimer = setTimeout(() => {
          connectTenant(tenantId).catch(error => {
            console.error(`WhatsApp tenant ${tenantId}: koneksi ulang gagal:`, error);
          });
        }, 3000);
      }
    }
  });
  return publicStatus(tenantId);
}

async function disconnectTenant(tenantId) {
  const connection = connections.get(tenantId);
  if (!connection) return publicStatus(tenantId);
  connection.enabled = false;
  clearTimeout(connection.reconnectTimer);
  if (connection.socket) await connection.socket.logout().catch(() => {});
  connection.socket = null;
  connection.qr = '';
  connection.groups = [];
  connection.phone = '';
  connection.status = 'disconnected';
  connection.error = '';
  await resetSession(tenantId);
  return publicStatus(tenantId);
}

async function getGroups(tenantId) {
  await refreshGroups(tenantId);
  return publicStatus(tenantId).groups;
}

async function sendGroupMessage(tenantId, groupId, text) {
  const connection = connections.get(tenantId);
  if (!connection || connection.status !== 'connected' || !connection.socket) {
    throw new Error('WhatsApp tenant belum terhubung');
  }
  if (!connection.groups.some(group => group.id === groupId) || !String(groupId).endsWith('@g.us')) {
    throw new Error('Grup tujuan tidak ada di daftar grup yang terhubung');
  }
  return connection.socket.sendMessage(groupId, { text });
}

function normalizeDay(value) {
  return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
}

function weekdayName(date) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: TIME_ZONE })
    .format(new Date(`${date}T00:00:00+07:00`));
}

function currentLocalDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function averageClassScore(db, tenantId, classId) {
  const byStudent = new Map();
  db.grades.filter(grade =>
    grade.tenant_id === tenantId && grade.class_id === classId
    && grade.nilai !== null && grade.nilai !== undefined && String(grade.nilai).trim() !== ''
    && Number.isFinite(Number(grade.nilai))
  ).forEach(grade => {
    const key = grade.student_id;
    if (!key) return;
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key).push(Number(grade.nilai));
  });
  const averages = [...byStudent.values()].map(scores => scores.reduce((sum, score) => sum + score, 0) / scores.length);
  if (!averages.length) return null;
  return Math.round(averages.reduce((sum, score) => sum + score, 0) / averages.length * 10) / 10;
}

function createReminderMessage(db, tenant, job, schedule) {
  const classItem = db.classes.find(item => item.id === schedule.class_id && item.tenant_id === tenant.id);
  const subject = db.subjects.find(item => item.id === schedule.subject_id && item.tenant_id === tenant.id);
  const average = averageClassScore(db, tenant.id, schedule.class_id);
  const url = tenant.whatsapp_sender?.lms_url || process.env.PUBLIC_APP_URL || '';
  return [
    'Pengingat Geo Edulabs',
    `Kelas: ${classItem ? classItem.nama : '-'}`,
    `Mapel: ${subject ? subject.nama : '-'}`,
    `Jadwal: ${schedule.hari || '-'}, ${schedule.jam_mulai || '-'}–${schedule.jam_selesai || '-'}`,
    'Ayo selesaikan materi dan evaluasi LMS.',
    `Rata-rata nilai kelas: ${average === null ? 'Belum ada data' : average}`,
    `Buka LMS: ${url}`
  ].join('\n');
}

async function processDueJobs(loadDB, saveDB) {
  if (schedulerBusy) return;
  schedulerBusy = true;
  try {
    const now = currentLocalDateTime();
    const snapshot = await loadDB();
    const dueJobIds = (snapshot.whatsapp_jobs || []).filter(job =>
      job.status === 'scheduled'
      && (job.tanggal < now.date || (job.tanggal === now.date && job.waktu <= now.time))
    ).map(job => job.id);
    for (const jobId of dueJobIds) {
      const db = await loadDB();
      const job = (db.whatsapp_jobs || []).find(item => item.id === jobId && item.status === 'scheduled');
      if (!job) continue;
      const tenant = db.tenants.find(item => item.id === job.tenant_id);
      const schedule = db.schedules.find(item => item.id === job.schedule_id && item.tenant_id === job.tenant_id);
      if (!tenant?.whatsapp_sender?.enabled || !schedule) {
        job.status = 'failed';
        job.last_error = !schedule ? 'Jadwal pelajaran tidak ditemukan' : 'WhatsApp tenant dinonaktifkan';
        job.updated_at = new Date().toISOString();
        await saveDB(db);
        continue;
      }
      job.status = 'sending';
      job.updated_at = new Date().toISOString();
      await saveDB(db);
      try {
        const text = createReminderMessage(db, tenant, job, schedule);
        const result = await sendGroupMessage(job.tenant_id, job.group_id, text);
        const finalDb = await loadDB();
        const finalJob = (finalDb.whatsapp_jobs || []).find(item => item.id === jobId);
        if (!finalJob) continue;
        finalJob.status = 'sent';
        finalJob.sent_at = new Date().toISOString();
        finalJob.message_id = result?.key?.id || '';
        finalJob.last_error = '';
        finalJob.updated_at = new Date().toISOString();
        await saveDB(finalDb);
      } catch (error) {
        const finalDb = await loadDB();
        const finalJob = (finalDb.whatsapp_jobs || []).find(item => item.id === jobId);
        if (finalJob) {
          finalJob.status = 'failed';
          finalJob.last_error = String(error.message || 'Pengiriman gagal').slice(0, 300);
          finalJob.updated_at = new Date().toISOString();
          await saveDB(finalDb);
        }
        console.error(`WhatsApp job ${job.id} gagal dikirim:`, error);
      }
    }

    await processAutoJobs(loadDB, saveDB, now);
  } finally {
    schedulerBusy = false;
  }
}

// Pengingat otomatis: satu job per jadwal kelas, dikirim pada hari & jam pelajaran.
async function processAutoJobs(loadDB, saveDB, now) {
  const today = normalizeDay(weekdayName(now.date));
  const snapshot = await loadDB();
  const autoJobs = (snapshot.whatsapp_jobs || [])
    .filter(job => job.mode === 'auto' && job.status === 'active')
    .map(job => job.id);
  for (const jobId of autoJobs) {
    const db = await loadDB();
    const job = (db.whatsapp_jobs || []).find(item => item.id === jobId && item.status === 'active');
    if (!job) continue;
    const tenant = (db.tenants || []).find(item => item.id === job.tenant_id);
    const schedule = (db.schedules || []).find(item => item.id === job.schedule_id && item.tenant_id === job.tenant_id);
    if (!tenant?.whatsapp_sender?.enabled || !schedule) continue;
    if (normalizeDay(schedule.hari) !== today) continue;
    if (!schedule.jam_mulai || String(now.time) < String(schedule.jam_mulai)) continue;
    if (job.last_sent_date === now.date) continue;

    try {
      const text = createReminderMessage(db, tenant, job, schedule);
      const result = await sendGroupMessage(job.tenant_id, job.group_id, text);
      job.last_sent_date = now.date;
      job.last_sent_at = new Date().toISOString();
      job.message_id = result?.key?.id || '';
      job.last_error = '';
    } catch (error) {
      job.last_sent_date = now.date;
      job.last_error = String(error.message || 'Pengiriman gagal').slice(0, 300);
      console.error(`WhatsApp auto job ${job.id} gagal dikirim:`, error);
    }
    job.updated_at = new Date().toISOString();
    await saveDB(db);
  }
}

function startScheduler(loadDB, saveDB) {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    processDueJobs(loadDB, saveDB).catch(error => console.error('WhatsApp scheduler gagal:', error));
  }, 30000);
  schedulerTimer.unref?.();
  processDueJobs(loadDB, saveDB).catch(error => console.error('WhatsApp scheduler gagal:', error));
}

async function initializeWhatsApp(loadDB, saveDB) {
  const db = await loadDB();
  let recoveredInFlight = false;
  for (const job of db.whatsapp_jobs || []) {
    if (job.status === 'sending') {
      job.status = 'failed';
      job.last_error = 'Server restart saat pengiriman berlangsung. Periksa grup sebelum menjadwalkan ulang.';
      job.updated_at = new Date().toISOString();
      recoveredInFlight = true;
    }
  }
  if (recoveredInFlight) await saveDB(db);
  const enabledTenants = db.tenants.filter(tenant => tenant.whatsapp_sender?.enabled);
  await Promise.all(enabledTenants.map(tenant =>
    connectTenant(tenant.id).catch(error => {
      console.error(`WhatsApp tenant ${tenant.id}: inisialisasi gagal:`, error);
    })
  ));
}

function validateLmsUrl(value) {
  const url = new URL(String(value || ''));
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Tautan LMS harus berupa URL http/https yang valid');
  }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Tautan LMS publik harus menggunakan HTTPS');
  }
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function registerWhatsAppRoutes(app, { loadDB, saveDB, requireAuth, requireAdmin, requireTenant }) {
  app.get('/api/admin/whatsapp', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const db = await loadDB();
    const tenant = db.tenants.find(item => item.id === req.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
    const jobs = (db.whatsapp_jobs || [])
      .filter(job => job.tenant_id === req.tenantId)
      .sort((a, b) => `${a.tanggal}T${a.waktu}`.localeCompare(`${b.tanggal}T${b.waktu}`))
      .map(job => {
        const schedule = db.schedules.find(item => item.id === job.schedule_id);
        const classItem = schedule && db.classes.find(item => item.id === schedule.class_id);
        const subject = schedule && db.subjects.find(item => item.id === schedule.subject_id);
        return {
          ...job,
          kelas: classItem ? classItem.nama : '-',
          mapel: subject ? subject.nama : '-',
          hari: schedule ? schedule.hari : '-',
          jam_mulai: schedule ? schedule.jam_mulai : '-',
          mode: job.mode || 'manual'
        };
      });
    res.json({
      config: {
        enabled: !!tenant.whatsapp_sender?.enabled,
        lms_url: tenant.whatsapp_sender?.lms_url || process.env.PUBLIC_APP_URL || ''
      },
      connection: publicStatus(req.tenantId),
      timezone: TIME_ZONE,
      jobs
    });
  });

  app.post('/api/admin/whatsapp/connect', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const db = await loadDB();
    const tenant = db.tenants.find(item => item.id === req.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
    let lmsUrl;
    try {
      lmsUrl = validateLmsUrl(req.body?.lms_url || process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    tenant.whatsapp_sender = { ...(tenant.whatsapp_sender || {}), enabled: true, lms_url: lmsUrl };
    await saveDB(db);
    let connection;
    try {
      connection = await connectTenant(tenant.id);
    } catch (error) {
      console.error(`WhatsApp tenant ${tenant.id}: gagal menghubungkan:`, error);
      return res.status(502).json({ error: error.message || 'Gagal menghubungkan WhatsApp' });
    }
    res.json({ connection, config: tenant.whatsapp_sender });
  });

  app.post('/api/admin/whatsapp/disconnect', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = await loadDB();
    const tenant = db.tenants.find(item => item.id === req.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant tidak ditemukan' });
    tenant.whatsapp_sender = { ...(tenant.whatsapp_sender || {}), enabled: false };
    await saveDB(db);
    const connection = await disconnectTenant(tenant.id);
    res.json({ success: true, connection });
  });

  app.get('/api/admin/whatsapp/groups', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const groups = await getGroups(req.tenantId);
      const query = String(req.query.q || '').trim().toLowerCase();
      res.json({
        groups: query ? groups.filter(group => group.subject.toLowerCase().includes(query)) : groups,
        connection: publicStatus(req.tenantId)
      });
    } catch (error) {
      console.error(`WhatsApp tenant ${req.tenantId}: gagal memuat grup:`, error);
      res.status(502).json({
        error: error.message || 'Gagal memuat grup WhatsApp',
        connection: publicStatus(req.tenantId)
      });
    }
  });

  app.post('/api/admin/whatsapp/verify-number', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const digits = String(req.body?.number || '').replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      return res.status(400).json({ error: 'Nomor WhatsApp harus 8–15 digit' });
    }
    const connection = connections.get(req.tenantId);
    if (!connection || connection.status !== 'connected' || !connection.socket) {
      return res.status(409).json({ error: 'Hubungkan WhatsApp terlebih dahulu untuk mencari nomor' });
    }
    try {
      const results = await connection.socket.onWhatsApp(digits);
      const found = Array.isArray(results) ? results.find(item => item && item.exists) : null;
      res.json({ number: digits, exists: !!found, jid: found?.jid || '' });
    } catch (error) {
      res.status(502).json({ error: `Gagal memeriksa nomor: ${error.message || 'tidak diketahui'}` });
    }
  });

  app.post('/api/admin/whatsapp/test-send', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const connection = connections.get(req.tenantId);
    if (!connection || connection.status !== 'connected' || !connection.socket) {
      return res.status(409).json({ error: 'WhatsApp belum terhubung. Pindai QR terlebih dahulu.' });
    }
    const groupId = String(req.body?.group_id || '').trim();
    const digits = String(req.body?.number || '').replace(/\D/g, '');
    const text = String(req.body?.message || '').trim();
    if (!text) return res.status(400).json({ error: 'Isi pesan tidak boleh kosong' });
    if (text.length > 2000) return res.status(400).json({ error: 'Pesan maksimal 2000 karakter' });
    let target = '';
    if (groupId) {
      if (!connection.groups.some(group => group.id === groupId)) {
        return res.status(400).json({ error: 'Grup tujuan tidak ada di daftar grup terhubung' });
      }
      target = groupId;
    } else if (digits.length >= 8 && digits.length <= 15) {
      target = `${digits}@s.whatsapp.net`;
    } else {
      return res.status(400).json({ error: 'Pilih grup atau masukkan nomor tujuan yang valid' });
    }
    const waktu = new Date().toLocaleString('id-ID', { timeZone: TIME_ZONE });
    const textWithFallback = text || [
      'Tes koneksi Geo Edulabs',
      `Waktu: ${waktu} WIB`,
      'Pesan ini dikirim dari panel admin LMS. Jika diterima, pengingat otomatis siap digunakan.'
    ].join('\n');
    try {
      const result = await connection.socket.sendMessage(target, { text: textWithFallback });
      res.json({ success: true, target, message_id: result?.key?.id || '' });
    } catch (error) {
      res.status(502).json({ error: error.message || 'Gagal mengirim pesan tes' });
    }
  });

  app.post('/api/admin/whatsapp/auto', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = await loadDB();
    const classId = String(req.body?.class_id || '');
    const groupId = String(req.body?.group_id || '');
    const classItem = (db.classes || []).find(item => item.id === classId && item.tenant_id === req.tenantId);
    if (!classItem) return res.status(400).json({ error: 'Kelas tidak ditemukan' });
    const groups = await getGroups(req.tenantId);
    const group = groups.find(item => item.id === groupId);
    if (!group) return res.status(400).json({ error: 'Pilih grup dari nomor WhatsApp yang telah terhubung' });
    const schedules = (db.schedules || []).filter(item => item.tenant_id === req.tenantId && item.class_id === classId);
    if (!schedules.length) return res.status(400).json({ error: 'Kelas ini belum memiliki jadwal pelajaran' });
    if (!Array.isArray(db.whatsapp_jobs)) db.whatsapp_jobs = [];
    let created = 0;
    for (const schedule of schedules) {
      const exists = db.whatsapp_jobs.some(job => job.tenant_id === req.tenantId && job.mode === 'auto'
        && job.schedule_id === schedule.id && job.group_id === groupId && job.status === 'active');
      if (exists) continue;
      db.whatsapp_jobs.push({
        id: crypto.randomUUID(),
        tenant_id: req.tenantId,
        mode: 'auto',
        schedule_id: schedule.id,
        group_id: groupId,
        group_name: group.subject,
        class_id: classId,
        status: 'active',
        last_sent_date: '',
        last_error: '',
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      created++;
    }
    await saveDB(db);
    res.status(created ? 201 : 200).json({ created, total: schedules.length });
  });

  app.post('/api/admin/whatsapp/jobs', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = await loadDB();
    const schedule = db.schedules.find(item => item.id === req.body?.schedule_id && item.tenant_id === req.tenantId);
    if (!schedule) return res.status(400).json({ error: 'Jadwal pelajaran tenant ini wajib dipilih' });
    const { group_id: groupId, tanggal, waktu } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(tanggal || ''))
      || !/^\d{2}:\d{2}$/.test(String(waktu || ''))
      || Number(waktu.slice(0, 2)) > 23 || Number(waktu.slice(3, 5)) > 59) {
      return res.status(400).json({ error: 'Tanggal dan waktu pengiriman tidak valid' });
    }
    const dateCheck = new Date(`${tanggal}T00:00:00.000Z`);
    if (Number.isNaN(dateCheck.getTime()) || dateCheck.toISOString().slice(0, 10) !== tanggal) {
      return res.status(400).json({ error: 'Tanggal pengiriman tidak valid' });
    }
    const now = currentLocalDateTime();
    if (tanggal < now.date || (tanggal === now.date && waktu < now.time)) {
      return res.status(400).json({ error: 'Tanggal dan waktu pengiriman harus di masa depan (WIB)' });
    }
    const groups = await getGroups(req.tenantId);
    if (!groups.some(group => group.id === groupId)) {
      return res.status(400).json({ error: 'Pilih grup dari nomor WhatsApp yang telah terhubung' });
    }
    if (!Array.isArray(db.whatsapp_jobs)) db.whatsapp_jobs = [];
    if (db.whatsapp_jobs.some(job =>
      job.tenant_id === req.tenantId && job.schedule_id === schedule.id
      && job.group_id === groupId && job.tanggal === tanggal
      && ['scheduled', 'sending', 'sent'].includes(job.status)
    )) {
      return res.status(409).json({ error: 'Pengingat untuk jadwal, grup, dan tanggal ini sudah pernah dibuat' });
    }
    const jobsForDay = db.whatsapp_jobs.filter(job =>
      job.tenant_id === req.tenantId && job.tanggal === tanggal
      && ['scheduled', 'sending', 'sent'].includes(job.status)
    ).length;
    if (jobsForDay >= 100) {
      return res.status(429).json({ error: 'Batas 100 pesan terjadwal per tenant per hari telah tercapai' });
    }
    const job = {
      id: require('crypto').randomUUID(),
      tenant_id: req.tenantId,
      schedule_id: schedule.id,
      group_id: groupId,
      group_name: groups.find(group => group.id === groupId).subject,
      tanggal,
      waktu,
      status: 'scheduled',
      created_by: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.whatsapp_jobs.push(job);
    await saveDB(db);
    res.status(201).json(job);
  });

  app.delete('/api/admin/whatsapp/jobs/:id', requireAuth, requireAdmin, requireTenant, async (req, res) => {
    const db = await loadDB();
    const index = (db.whatsapp_jobs || []).findIndex(job =>
      job.id === req.params.id && job.tenant_id === req.tenantId
    );
    if (index < 0) return res.status(404).json({ error: 'Jadwal pesan tidak ditemukan' });
    const job = db.whatsapp_jobs[index];
    if (!['scheduled', 'failed', 'active'].includes(job.status)) {
      return res.status(409).json({ error: 'Pesan yang sedang atau sudah terkirim tidak dapat dibatalkan' });
    }
    db.whatsapp_jobs.splice(index, 1);
    await saveDB(db);
    res.json({ success: true });
  });
}

module.exports = {
  registerWhatsAppRoutes,
  initializeWhatsApp,
  startScheduler,
  processDueJobs,
  processAutoJobs,
  currentLocalDateTime,
  averageClassScore,
  createReminderMessage,
  normalizeDay,
  weekdayName
};
