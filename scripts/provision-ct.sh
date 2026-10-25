#!/usr/bin/env bash
# Provision server LMS Geografi di LXC (Ubuntu 24.04): Node.js + PM2 + nginx + app.
# Jalankan sebagai root: bash provision-ct.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR=/opt/lms-geografi
REPO=https://github.com/wsejagad-arch/lms-geografi.git
step() { echo "[provision] $*"; }

step "apt packages"
apt-get update -qq
apt-get install -y -qq curl ca-certificates git gnupg openssl nginx

step "nodejs"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
node -v

step "pm2"
command -v pm2 >/dev/null || npm i -g pm2 >/dev/null 2>&1

step "app source"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  git clone --depth 1 "$REPO" "$APP_DIR"
fi

step "dependencies"
cd "$APP_DIR"
npm ci --omit=dev >/dev/null 2>&1 || npm install --omit=dev >/dev/null 2>&1

step "env"
if [ ! -f "$APP_DIR/.env" ]; then
  echo "SESSION_SECRET=$(openssl rand -hex 32)" > "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi
# shellcheck disable=SC1091
set -a; . "$APP_DIR/.env"; set +a

step "pm2 app"
pm2 delete lms >/dev/null 2>&1 || true
NODE_ENV=production PORT=3000 SESSION_SECRET="$SESSION_SECRET" pm2 start server.js --name lms -i 2 >/dev/null
pm2 save >/dev/null
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

step "nginx reverse proxy"
cat > /etc/nginx/sites-available/lms <<'NGINX'
server {
  listen 80 default_server;
  server_name _;
  client_max_body_size 25m;
  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
  }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms
nginx -t >/dev/null
systemctl restart nginx
systemctl enable nginx >/dev/null 2>&1

step "health check"
sleep 2
curl -fsS -o /dev/null -w "app_http=%{http_code}\n" http://127.0.0.1:3000/ || app_http=fail
curl -fsS -o /dev/null -w "nginx_http=%{http_code}\n" http://127.0.0.1/ || nginx_http=fail
systemctl is-active --quiet nginx && echo "nginx=active"
pm2 jlist | grep -c '"name":"lms"' | sed 's/^/pm2_proc=/'
echo "[provision] DONE"
