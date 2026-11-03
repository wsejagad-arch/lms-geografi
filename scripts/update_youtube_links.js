const fs = require('fs');
const path = require('path');

const YOUTUBE_MAPPING = {
  // Kelas X
  'x-01': '3azHVLowg48', // Konsep Dasar Geografi (Kita Pintar)
  'x-02': 'yb72Xe7OYVU', // Pengertian Peta dan Komponen Peta (SMA/MA Kelas 10)
  'x-03': '9P563sewbAQ', // Penginderaan Jauh dan SIG - Geografi Kelas X
  'x-04': 'N2pJsgv9sQ8', // Pengetahuan Peta, PJ, dan SIG Kelas X
  'x-05': '62D4R1XFshM', // Dinamika Litosfer dan Vulkanisme
  'x-06': 'prEbxUuNxYU', // Dinamika Atmosfer Full Materi
  'x-07': 'cTlY4dDk0aQ', // Dinamika Hidrosfer
  'x-08': 'Y9K7W33lXzI', // Mitigasi Bencana Alam

  // Kelas XI
  'xi-01': '_fiE_lIWsN4', // Posisi Strategis Indonesia
  'xi-02': 'pNa4DrlE5VI', // Sebaran Flora dan Fauna di Dunia
  'xi-03': 'a1qLbdUMY5w', // Pengelolaan SDA di Indonesia
  'xi-04': 'jImoIOxGlL4', // Ketahanan Pangan Nasional
  'xi-05': 'VEHeTXPlYmw', // Dinamika Penduduk / Geografi Kelas XI
  'xi-06': 'HU0vIXAYjms', // Keragaman Budaya Indonesia
  'xi-07': 'JRoK5RTF_ls', // AMDAL Dalam Pembangunan
  'xi-08': 'XCTwc_NUUhg', // Mitigasi dan Adaptasi Bencana Kurikulum Merdeka

  // Kelas XII
  'xii-01': 'kKqi7zgIq0o', // Pengembangan Wilayah dan Tata Ruang
  'xii-02': 'ypXeZMgHOAg', // Interaksi Desa dan Kota
  'xii-03': 'y0w75s8-bY0', // Penginderaan Jauh untuk Jaringan Transportasi
  'xii-04': '0pw6-xzQ1QE', // Negara Maju dan Negara Berkembang
  'xii-05': 'tCfBnVwcwfo', // Kerjasama Negara Maju dan Berkembang
  'xii-06': 'QZpJ00FaUuo', // Isu Lingkungan Global & Pemanasan Global (Direktorat SMA)

  // Non-bab standalone
  'stat': 'hieku07CLBo'   // Peta Tematik & Statistik Kependudukan
};

function updateKontenEmbed(konten, newYtId) {
  if (!konten) return konten;
  // Replace embed URLs
  return konten.replace(
    /https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}/g,
    `https://www.youtube.com/embed/${newYtId}`
  );
}

// 1. Backup & Update data/db.json
const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const dbBackupPath = path.join(__dirname, '..', 'data', `db.json.backup-${Date.now()}`);
fs.copyFileSync(dbPath, dbBackupPath);
console.log(`[Backup] Created ${dbBackupPath}`);

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let updatedMaterialsCount = 0;
if (Array.isArray(db.materials)) {
  db.materials.forEach(m => {
    let targetYt = null;
    if (m.bab_id && YOUTUBE_MAPPING[m.bab_id]) {
      targetYt = YOUTUBE_MAPPING[m.bab_id];
    } else if (m.judul && m.judul.includes('Dasar-Dasar Ilmu Geografi')) {
      targetYt = YOUTUBE_MAPPING['x-01'];
    } else if (m.judul && m.judul.includes('Statistik Geografi')) {
      targetYt = YOUTUBE_MAPPING['stat'];
    }

    if (targetYt) {
      m.youtube_id = targetYt;
      if (m.konten) {
        m.konten = updateKontenEmbed(m.konten, targetYt);
      }
      updatedMaterialsCount++;
      console.log(`Updated material: [${m.bab_id || 'no-bab'}] ${m.judul} -> ${targetYt}`);
    }
  });
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`[db.json] Successfully updated ${updatedMaterialsCount} materials.`);

// 2. Update data/kurikulum/**/*.json
const kurikulumDir = path.join(__dirname, '..', 'data', 'kurikulum');
function walkFiles(dir) {
  let files = [];
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walkFiles(full));
    } else if (f.endsWith('.json')) {
      files.push(full);
    }
  });
  return files;
}

const kurikulumFiles = walkFiles(kurikulumDir);
let updatedKurikulumBabCount = 0;

kurikulumFiles.forEach(file => {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;

  if (Array.isArray(content)) {
    content.forEach(bab => {
      if (bab.id && YOUTUBE_MAPPING[bab.id]) {
        const newYt = YOUTUBE_MAPPING[bab.id];
        bab.youtube_id = newYt;
        if (bab.materi && Array.isArray(bab.materi)) {
          bab.materi.forEach(sub => {
            if (sub.youtube_id) sub.youtube_id = newYt;
            if (sub.konten) sub.konten = updateKontenEmbed(sub.konten, newYt);
          });
        }
        changed = true;
        updatedKurikulumBabCount++;
        console.log(`[Kurikulum] Updated bab ${bab.id} in ${path.basename(file)} -> ${newYt}`);
      }
    });
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(content, null, 2), 'utf8');
  }
});

console.log(`[Kurikulum] Successfully updated ${updatedKurikulumBabCount} bab entries across kurikulum files.`);
console.log('All YouTube links updated successfully to authentic, relevant videos!');

