#!/usr/bin/env bash
# =============================================================================
#  LMS Geografi Multi-Tenant - pemeriksaan kesehatan deploy
#  Pemakaian: bash cek-deploy.sh [domain]
# =============================================================================
APP_DIR="${APP_DIR:-/var/www/lms-geografi}"
APP_NAME="${APP_NAME:-lms-geografi}"
DOMAIN="${1:-${DOMAIN:-geolabs.my.id}}"
OK=0; BAD=0
g() { printf '\033[0;32m[OK]\033[0m %s\n' "$*"; OK=$((OK+1)); }
b() { printf '\033[0;31m[!!]\033[0m %s\n' "$*"; BAD=$((BAD+1)); }
h() { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }

PORT="$( [ -f "$APP_DIR/.env" ] && grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2 )"
PORT="${PORT:-3000}"

h "Layanan"
systemctl is-active --quiet nginx && g "nginx aktif" || b "nginx TIDAK aktif"
if command -v pm2 >/dev/null 2>&1; then
  pid="$(pm2 pid "$APP_NAME" 2>/dev/null | tr -d '[:space:]')"
  if [ -n "$pid" ] && [ "$pid" != "0" ]; then g "PM2 ${APP_NAME} online (pid ${pid})"; else b "PM2 ${APP_NAME} tidak berjalan"; fi
else
  b "PM2 tidak terpasang"
fi

h "Berkas aplikasi"
[ -f "$APP_DIR/server.js" ] && g "server.js ada" || b "server.js tidak ada"
[ -f "$APP_DIR/ecosystem.config.js" ] && g "ecosystem.config.js ada" || b "ecosystem.config.js tidak ada"
[ -f "$APP_DIR/.env" ] && g ".env ada" || b ".env tidak ada"
[ -f "$APP_DIR/data/db.json" ] && g "data/db.json ada" || b "data/db.json tidak ada"

h "Konfigurasi"
if [ -f "$APP_DIR/.env" ]; then
  if grep -q '^SESSION_SECRET=lms-secret-key' "$APP_DIR/.env"; then
    b "SESSION_SECRET masih nilai default"
  else
    g "SESSION_SECRET kustom"
  fi
  grep -q "^PORT=${PORT}$" "$APP_DIR/.env" && g "PORT=${PORT}" || b "PORT di .env tidak sama dengan ${PORT}"
fi
if ls -l "$APP_DIR/.env" 2>/dev/null | grep -q '^-rw-------'; then g ".env hanya bisa dibaca root"; else b "izin .env terlalu terbuka (chmod 600)"; fi

h "Jaringan"
if command -v ss >/dev/null 2>&1; then
  ss -ltn 2>/dev/null | grep -q ":${PORT}\b" && g "port ${PORT} listen" || b "port ${PORT} tidak listen"
fi
code_app="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://127.0.0.1:${PORT}/" || true)"
[ "$code_app" = "200" ] && g "aplikasi HTTP 200" || b "aplikasi HTTP ${code_app}"
code_api="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://127.0.0.1:${PORT}/api/me" || true)"
[ "$code_api" = "401" ] && g "/api/me 401 tanpa sesi" || b "/api/me mengembalikan ${code_api}"
code_web="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 -H "Host: ${DOMAIN}" "http://127.0.0.1/" || true)"
[ "$code_web" = "200" ] && g "nginx (Host ${DOMAIN}) HTTP 200" || b "nginx (Host ${DOMAIN}) HTTP ${code_web}"

h "TLS"
if curl -s -o /dev/null --max-time 8 "https://${DOMAIN}/" 2>/dev/null; then
  exp="$(echo | openssl s_client -servername "$DOMAIN" -connect "${DOMAIN}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  if [ -n "$exp" ]; then
    days=$(( ( $(date -d "$exp" +%s) - $(date +%s) ) / 86400 ))
    if [ "$days" -gt 14 ]; then g "sertifikat berlaku ${days} hari"; else b "sertifikat kedaluwarsa dalam ${days} hari"; fi
  else
    b "sertifikat tidak dapat dibaca"
  fi
else
  b "HTTPS ${DOMAIN} tidak merespons"
fi

h "Data"
if [ -f "$APP_DIR/data/db.json" ]; then
  size="$(du -h "$APP_DIR/data/db.json" | cut -f1)"
  age="$(find "$APP_DIR/data/db.json" -mmin +1440 | wc -l)"
  g "db.json ${size}, diubah $(date -r "$APP_DIR/data/db.json" '+%Y-%m-%d %H:%M')"
  [ "$age" -eq 0 ] && g "ada penulisan data dalam 24 jam terakhir" || b "tidak ada perubahan data > 24 jam (wajar bila sepi)"
fi
backups="$(find "$APP_DIR/data" -maxdepth 1 -name 'db.json*' ! -name 'db.json' 2>/dev/null | wc -l)"
[ "$backups" -gt 0 ] && g "${backups} berkas backup tersedia" || b "belum ada backup db.json"

h "Disk"
use="$(df / | awk 'NR==2 {gsub("%","",$5); print $5}')"
[ "$use" -lt 85 ] && g "pemakaian disk ${use}%" || b "pemakaian disk ${use}% (bersihkan)"

h "Ringkasan"
printf 'lolos=%d gagal=%d\n' "$OK" "$BAD"
[ "$BAD" -eq 0 ] || exit 1
