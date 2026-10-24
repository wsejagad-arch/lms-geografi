#!/usr/bin/env bash
# =============================================================================
#  LMS Geografi Multi-Tenant - skrip deploy
#  Target : Debian 12 / Ubuntu 22.04+ (dijalankan sebagai root di server)
#  Stack  : Node.js + PM2 + Nginx + Cloudflare
#  Domain : geolabs.my.id
#
#  Pemakaian:
#     bash deploy.sh
#  Override variabel, contoh:
#     DOMAIN=lms.contoh.id ENABLE_TLS=1 EMAIL=admin@contoh.id bash deploy.sh
#
#  ENABLE_TLS=1 memasang sertifikat Let's Encrypt lewat certbot.
#  ENABLE_TLS=0 (default) memakai Cloudflare dengan mode SSL Full (strict)
#  dan sertifikat origin yang dipasang manual.
# =============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-geolabs.my.id}"
APP_DIR="${APP_DIR:-/var/www/lms-geografi}"
APP_NAME="${APP_NAME:-lms-geografi}"
REPO="${REPO:-https://github.com/wsejagad-arch/lms-geografi.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3000}"
NODE_MAJOR="${NODE_MAJOR:-20}"
ENABLE_TLS="${ENABLE_TLS:-0}"
EMAIL="${EMAIL:-admin@geolabs.my.id}"

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
info() { echo -e "${G}[OK]${N} $*"; }
warn() { echo -e "${Y}[..]${N} $*"; }
fail() { echo -e "${R}[!!]${N} $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Jalankan sebagai root: sudo bash deploy.sh"
[ -f /etc/debian_version ] || fail "Skrip ini untuk Debian/Ubuntu."
command -v systemctl >/dev/null 2>&1 || fail "systemd tidak ditemukan."

# ------------------------------- Paket dasar ---------------------------------
warn "Memeriksa paket dasar"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git openssl nginx >/dev/null
info "Paket dasar siap"

# ------------------------------- Node.js -------------------------------------
need_node=0
if command -v node >/dev/null 2>&1; then
  cur_major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$cur_major" -lt "$NODE_MAJOR" ] && need_node=1
else
  need_node=1
fi
if [ "$need_node" -eq 1 ]; then
  warn "Memasang Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
info "Node.js $(node -v)"

# ------------------------------- Kode aplikasi --------------------------------
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  warn "Menarik pembaruan ${BRANCH}"
  git fetch --prune origin
  git checkout -q "$BRANCH"
  git reset --hard "origin/${BRANCH}"
else
  mkdir -p "$(dirname "$APP_DIR")"
  warn "Mengkloning ${REPO}"
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi
info "Kode di ${APP_DIR} ($(git rev-parse --short HEAD))"

warn "Memasang dependensi produksi"
if [ -f package-lock.json ]; then
  npm ci --omit=dev --no-audit --no-fund
else
  npm install --omit=dev --no-audit --no-fund
fi
info "Dependensi siap"

# ------------------------------- Konfigurasi ---------------------------------
if [ -f .env ]; then
  warn ".env sudah ada, tidak diubah"
else
  cp .env.example .env
  secret="$(openssl rand -hex 32)"
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${secret}|" .env
  sed -i "s|^PORT=.*|PORT=${PORT}|" .env
  chmod 600 .env
  info ".env dibuat dengan SESSION_SECRET acak"
fi
mkdir -p data
[ -f data/db.json ] || warn "data/db.json belum ada; dibuat otomatis saat aplikasi pertama berjalan"

# ------------------------------- PM2 -----------------------------------------
if ! command -v pm2 >/dev/null 2>&1; then
  warn "Memasang PM2"
  npm install -g pm2 --no-audit --no-fund >/dev/null
fi
pm2 startOrReload ecosystem.config.js --update-env
pm2 save >/dev/null
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
info "PM2 menjalankan ${APP_NAME}"

# ------------------------------- Nginx ---------------------------------------
SITE="/etc/nginx/sites-available/${APP_NAME}.conf"
cat > "$SITE" <<'TPL'
# Cloudflare real IP
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;

server {
    listen 80;
    listen [::]:80;
    server_name @DOMAIN@;

    server_tokens off;
    client_max_body_size 12m;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 512;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript application/manifest+json image/svg+xml;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location /assets/ {
        proxy_pass http://127.0.0.1:@PORT@;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location = /sw.js {
        proxy_pass http://127.0.0.1:@PORT@;
        add_header Cache-Control "no-cache" always;
    }

    location / {
        proxy_pass http://127.0.0.1:@PORT@;
        proxy_read_timeout 65s;
    }
}
TPL
sed -i "s|@DOMAIN@|${DOMAIN}|g; s|@PORT@|${PORT}|g" "$SITE"
ln -sf "$SITE" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
nginx -t
systemctl enable --now nginx >/dev/null 2>&1 || true
systemctl reload nginx
info "Nginx aktif untuk ${DOMAIN}"

# ------------------------------- TLS (opsional) ------------------------------
if [ "$ENABLE_TLS" = "1" ]; then
  warn "Memasang sertifikat Let's Encrypt"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
  info "TLS aktif untuk ${DOMAIN}"
else
  warn "TLS dilewati (ENABLE_TLS=0). Pakai Cloudflare SSL Full (strict) + origin certificate."
fi

# ------------------------------- Verifikasi ----------------------------------
warn "Memeriksa aplikasi"
code_app="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${PORT}/" || true)"
code_web="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: ${DOMAIN}" "http://127.0.0.1/" || true)"
code_api="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${PORT}/api/me" || true)"
[ "$code_app" = "200" ] || fail "Aplikasi tidak merespons di 127.0.0.1:${PORT} (HTTP ${code_app}). Cek: pm2 logs ${APP_NAME}"
[ "$code_web" = "200" ] || fail "Nginx gagal meneruskan request (HTTP ${code_web}). Cek: nginx -t dan akses log."
[ "$code_api" = "401" ] || fail "Endpoint /api/me harus 401 tanpa sesi, dapat ${code_api}"
info "Aplikasi 200, Nginx 200, /api/me 401"

echo
info "Deploy selesai"
echo "   URL      : http://${DOMAIN} (aktifkan proxy Cloudflare untuk HTTPS)"
echo "   App dir  : ${APP_DIR}"
echo "   Log      : pm2 logs ${APP_NAME}"
echo "   Backup   : cp ${APP_DIR}/data/db.json ${APP_DIR}/data/db.json.\$(date +%F)"
echo "   Login    : admin@lms.id / admin  -> segera ganti kata sandi"
echo
echo "Langkah Cloudflare: A/CNAME ${DOMAIN} -> IP server, proxy ON, SSL/TLS mode Full (strict)."
