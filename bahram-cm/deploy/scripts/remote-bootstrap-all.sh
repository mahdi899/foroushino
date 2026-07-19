#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
LOG=/root/bahram-bootstrap.log
LOCK=/var/lock/bahram-bootstrap.lock
exec > >(tee -a "$LOG") 2>&1

export http_proxy=http://127.0.0.1:8888
export https_proxy=http://127.0.0.1:8888
export HTTP_PROXY=http://127.0.0.1:8888
export HTTPS_PROXY=http://127.0.0.1:8888

export PROXY_SHARED_TOKEN="abXgwdBJrq1k8EiUUcp3B62ELu4fn41iDQyIrIVDetWz2Z3S9VRBqhcBzaLGXdIA"
export SAT_SYNC_HMAC_SECRET="1e054cf9e82ca0a0bdecc9a269ec1605855750b1f64d5848181212c3b1feb3cf"
export TELEGRAM_WEBHOOK_SECRET="iGZmon1E5364a9DofD52snaT8LauUdKv"
export TELEGRAM_WEBHOOK_BASE_URL="https://broken-mountain-6b4f.shokspy.workers.dev"
export SITE_URL="https://rostami.app"
export FAMILY_URL="https://rostami.club"
export CDN_URL="https://cdn.rostami.app"
export FAMILY_CDN_URL="https://family-cdn.rostami.club"

mkdir -p /var/lock
exec 9>"$LOCK"
flock -n 9 || { echo "Another bootstrap is running"; exit 1; }

echo "=== START $(date -Is) ==="

cat > /etc/apt/apt.conf.d/99saat-proxy <<'EOF'
Acquire::http::Proxy "http://127.0.0.1:8888";
Acquire::https::Proxy "http://127.0.0.1:8888";
EOF

wait_apt() {
  for i in $(seq 1 60); do
    if ! fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
      return 0
    fi
    sleep 5
  done
  echo "apt lock timeout"; exit 1
}

echo "==> packages"
wait_apt
apt-get update -qq
wait_apt
apt-get install -y -qq git curl unzip ca-certificates gnupg lsb-release

echo "==> repo"
mkdir -p /var/www
ln -sfn /var/www/foroushino/bahram-cm /var/www/bahram-cm
test -d /var/www/foroushino/.git || { echo "Missing /var/www/foroushino"; exit 1; }

echo "==> bootstrap"
if [ ! -f /var/www/bahram-cm/backend/.env ]; then
  bash /var/www/bahram-cm/deploy/scripts/bootstrap-server.sh
else
  echo "backend .env exists — skipping bootstrap-server.sh"
fi

echo "==> ssl"
bash /var/www/bahram-cm/deploy/scripts/setup-origin-ssl.sh

echo "==> secrets"
bash /var/www/bahram-cm/deploy/scripts/apply-shared-secrets.sh
ENV=/var/www/bahram-cm/backend/.env
grep -q '^TELEGRAM_WEBHOOK_SECRET=' "$ENV" && sed -i "s|^TELEGRAM_WEBHOOK_SECRET=.*|TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}|" "$ENV" || echo "TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}" >> "$ENV"
grep -q '^TELEGRAM_WEBHOOK_BASE_URL=' "$ENV" && sed -i "s|^TELEGRAM_WEBHOOK_BASE_URL=.*|TELEGRAM_WEBHOOK_BASE_URL=${TELEGRAM_WEBHOOK_BASE_URL}|" "$ENV" || echo "TELEGRAM_WEBHOOK_BASE_URL=${TELEGRAM_WEBHOOK_BASE_URL}" >> "$ENV"

echo "==> webhook"
cd /var/www/bahram-cm/backend
php artisan config:clear && php artisan config:cache
php artisan telegram:sync-bots || true
php artisan telegram:webhook:set production || true

echo "=== DONE $(date -Is) ==="
pm2 list || true
curl -sI http://127.0.0.1:3000/ | head -3 || true
curl -sI https://rostami.app/ 2>&1 | head -5 || true
