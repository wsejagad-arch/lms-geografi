// Konfigurasi PM2. `.env` dibaca manual agar tidak menambah dependensi.
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env');
const env = { NODE_ENV: 'production' };

if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

module.exports = {
  apps: [
    {
      name: 'lms-geografi',
      script: 'server.js',
      cwd: __dirname,
      // Satu instance saja: database JSON dan cache in-memory tidak aman untuk cluster.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '350M',
      env: { ...env, PORT: env.PORT || '3000' }
    }
  ]
};
