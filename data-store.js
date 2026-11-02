// ===== PENYIMPANAN DATA LMS =====
// Sumber kebenaran: SQLite (node:sqlite pada Node >= 22.5, atau better-sqlite3).
// Bila tidak ada driver SQLite, dipakai berkas JSON yang sudah diperkuat (atomic + .prev).
// Berkas db.json tetap ditulis sebagai cermin agar skrip CLI (reset password, dsb) dan
// pemulihan berbasis berkas tetap berjalan seperti biasa.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const COLLECTIONS = [
  'users', 'tenants', 'subjects', 'classes', 'students', 'materials', 'questions', 'exams',
  'exam_questions', 'grades', 'assignments', 'attendance', 'schedules', 'progress', 'attempts',
  'session_logs', 'activity_logs', 'whatsapp_jobs', 'whatsapp_logs', 'jurnal'
];

function emptyDB() {
  const db = {};
  for (const key of COLLECTIONS) db[key] = [];
  return db;
}

function normalizeDB(db) {
  const out = db && typeof db === 'object' && !Array.isArray(db) ? db : emptyDB();
  for (const key of COLLECTIONS) {
    if (!Array.isArray(out[key])) out[key] = [];
  }
  return out;
}

function hasData(db) {
  return !!db && ((db.users || []).length > 0 || (db.students || []).length > 0 || (db.tenants || []).length > 0);
}

function countsOf(db) {
  const counts = {};
  for (const key of COLLECTIONS) counts[key] = (db[key] || []).length;
  return counts;
}

const state = {
  dbPath: null,
  sqlitePath: null,
  backend: 'json',
  store: null,
  lastSaveAt: null,
  lastSaveOk: null,
  ready: null
};

async function fileExists(target) {
  try { await fsp.access(target); return true; } catch { return false; }
}

function sqliteStoreFor(kind) {
  const SCHEMA = 'CREATE TABLE IF NOT EXISTS store (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL);';
  try {
    if (kind === 'node') {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(state.sqlitePath);
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA synchronous = FULL;');
      db.exec(SCHEMA);
      return {
        backend: 'sqlite:node',
        get() { const row = db.prepare('SELECT data FROM store WHERE id = 1').get(); return row ? String(row.data) : null; },
        put(text) {
          db.prepare('INSERT INTO store (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
            .run(text, new Date().toISOString());
        }
      };
    }
    const Database = require('better-sqlite3');
    const db = new Database(state.sqlitePath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = FULL');
    db.exec(SCHEMA);
    return {
      backend: 'sqlite:better-sqlite3',
      get() { const row = db.prepare('SELECT data FROM store WHERE id = 1').get(); return row ? String(row.data) : null; },
      put(text) {
        db.prepare('INSERT INTO store (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
          .run(text, new Date().toISOString());
      }
    };
  } catch {
    return null;
  }
}

async function readJsonFile(file) {
  return normalizeDB(JSON.parse(await fsp.readFile(file, 'utf-8')));
}

async function init(options = {}) {
  if (state.ready) return state.ready;
  state.dbPath = options.dbPath || path.join(__dirname, 'data', 'db.json');
  // Nama database diturunkan dari berkas DB agar tiap database (termasuk berkas uji
  // sementara) punya basis data sendiri dan tidak saling memakai.
  const derivedSqlite = `${String(state.dbPath).replace(/\.json$/i, '')}.sqlite`;
  state.sqlitePath = options.sqlitePath
    || process.env.LMS_SQLITE_PATH
    || derivedSqlite;

  state.ready = (async () => {
    // Prioritas: SQLite bila ada; coba dari berkas utama dulu agar migrasi mulus.
    if (options.driver !== 'json') {
      for (const kind of (options.driver ? [options.driver] : ['node', 'better-sqlite3'])) {
        const store = sqliteStoreFor(kind);
        if (!store) continue;
        state.store = store;
        state.backend = store.backend;
        try {
          if (!store.get()) {
            const existing = (await fileExists(state.dbPath)) ? await readJsonFile(state.dbPath) : null;
            const doc = existing && hasData(existing) ? existing : emptyDB();
            store.put(JSON.stringify(doc));
            if (hasData(doc)) {
              console.log(`[db] migrasi ${JSON.stringify(countsOf(doc))} ke ${store.backend} (${state.sqlitePath})`);
            } else {
              console.log(`[db] ${store.backend} baru dibuat (${state.sqlitePath})`);
            }
          }
        } catch (error) {
          console.error('[db] Migrasi ke SQLite gagal, kembali ke JSON:', error.message);
          state.store = null;
          state.backend = 'json';
        }
        return;
      }
    }
    console.log('[db] Driver SQLite tidak tersedia — memakai berkas JSON (atomic + .prev).');
  })();
  return state.ready;
}

async function loadDB() {
  await init(state.dbPath ? { dbPath: state.dbPath, sqlitePath: state.sqlitePath } : {});

  if (state.store) {
    try {
      const raw = state.store.get();
      if (raw) return normalizeDB(JSON.parse(raw));
    } catch (error) {
      console.error('[db] SQLite tidak terbaca, mencoba pemulihan dari berkas:', error.message);
    }
    // Pemulihan: bangun ulang SQLite dari cermin JSON yang valid.
    for (const file of [state.dbPath, `${state.dbPath}.prev`]) {
      try {
        const recovered = await readJsonFile(file);
        state.store.put(JSON.stringify(recovered));
        console.log(`[db] SQLite dipulihkan dari ${path.basename(file)}`);
        return recovered;
      } catch { /* coba berkas berikutnya */ }
    }
    throw new Error('Database SQLite rusak dan tidak ada cermin JSON yang bisa dipakai');
  }

  // Mode JSON: retry, fallback .prev, jangan pernah mengembalikan DB kosong saat berkas ada.
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const file of [state.dbPath, `${state.dbPath}.prev`]) {
      try {
        return await readJsonFile(file);
      } catch (error) {
        lastError = error;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  if (!(await fileExists(state.dbPath)) && !(await fileExists(`${state.dbPath}.prev`))) {
    return emptyDB();
  }
  console.error(`[db] Gagal membaca database (${state.dbPath}):`, lastError && lastError.message);
  throw lastError || new Error('Database tidak dapat dibaca');
}

// Tulis berurutan dengan berkas sementara unik agar penulisan bersamaan tidak merusak.
let writeChain = Promise.resolve();

async function writeJsonAtomic(snapshot) {
  const tmp = `${state.dbPath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  let currentValid = false;
  try {
    JSON.parse(await fsp.readFile(state.dbPath, 'utf-8'));
    currentValid = true;
  } catch { currentValid = false; }
  try {
    await fsp.writeFile(tmp, snapshot);
    if (currentValid) await fsp.copyFile(state.dbPath, `${state.dbPath}.prev`).catch(() => {});
    await fsp.rename(tmp, state.dbPath);
  } catch (error) {
    await fsp.unlink(tmp).catch(() => {});
    console.error('Penulisan atomik gagal, memakai penulisan langsung:', error.message);
    await fsp.writeFile(state.dbPath, snapshot);
  }
}

async function saveDB(db) {
  const task = async () => {
    const snapshot = JSON.stringify(db, null, 2);
    const incomingEmpty = !hasData(db);

    if (state.store) {
      const stored = (() => {
        try {
          const raw = state.store.get();
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();
      if (incomingEmpty && hasData(stored)) {
        console.error('[db] Penulisan dibatalkan: data kosong ditolak karena database berisi data.');
        return false;
      }
      state.store.put(JSON.stringify(db));
      // Cermin untuk skrip CLI & pemulihan berbasis berkas (kegagalan tidak mematikan simpan).
      await writeJsonAtomic(snapshot).catch(error => {
        console.error('[db] Gagal memperbarui cermin db.json:', error.message);
      });
      state.lastSaveAt = new Date().toISOString();
      state.lastSaveOk = true;
      return true;
    }

    const currentValid = await (async () => {
      try {
        const current = await readJsonFile(state.dbPath);
        return current;
      } catch { return null; }
    })();
    if (incomingEmpty && hasData(currentValid)) {
      console.error('[db] Penulisan dibatalkan: data kosong ditolak karena berkas berisi data.');
      return false;
    }
    await writeJsonAtomic(snapshot);
    state.lastSaveAt = new Date().toISOString();
    state.lastSaveOk = true;
    return true;
  };
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => {});
  return run;
}

// Dipakai skrip CLI (reset password, buat guru, dsb). Menulis lewat backend aktif
// supaya perubahan masuk ke SQLite DAN cermin db.json, bukan hanya berkas JSON.
async function mutateDB(mutator, options = {}) {
  await init({ dbPath: options.dbPath || state.dbPath, sqlitePath: options.sqlitePath || state.sqlitePath });
  const db = await loadDB();
  const result = await mutator(db);
  await saveDB(db);
  return { db, result, backend: state.backend };
}

function status() {
  return {
    backend: state.backend,
    dbPath: state.dbPath,
    sqlitePath: state.store ? state.sqlitePath : null,
    lastSaveAt: state.lastSaveAt,
    lastSaveOk: state.lastSaveOk
  };
}

module.exports = {
  COLLECTIONS,
  emptyDB,
  normalizeDB,
  hasData,
  countsOf,
  fileExists,
  init,
  loadDB,
  saveDB,
  mutateDB,
  status
};
