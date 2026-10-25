#!/usr/bin/env bash
# Pasang Cloudflare Tunnel dan arahkan trafik ke nginx (port 80) di LXC ini.
# Pemakaian: bash setup-tunnel.sh <TUNNEL_TOKEN>
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then
  echo "TUNNEL_TOKEN wajib"; exit 1
fi

if ! command -v cloudflared >/dev/null; then
  mkdir -p /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
    > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -qq
  apt-get install -y -qq cloudflared
fi

cloudflared service uninstall >/dev/null 2>&1 || true
cloudflared service install "$TOKEN" >/dev/null
systemctl enable cloudflared >/dev/null 2>&1
systemctl restart cloudflared
sleep 3
systemctl is-active cloudflared
echo "[tunnel] DONE"
