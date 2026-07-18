#!/usr/bin/env bash
# Saat — first-time production bootstrap (Ubuntu 22.04/24.04)
# Usage: sudo bash bootstrap-server.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

GIT_ROOT="${GIT_ROOT:-/var/www/mini-call-center}"
APP_ROOT="${APP_ROOT:-/var/www/saat}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
SITE_URL="${SITE_URL:-https://sat.center}"
DOMAIN="${DOMAIN:-sat.center}"
# Shared Telegram bot (@RostamiAppBot) — same token as bahram-cm. Saat only
# verifies Mini App initData signatures with it; it does NOT own the webhook.
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_BOT_USERNAME="${TELEGRAM_BOT_USERNAME:-RostamiAppBot}"

echo "==> Installing system packages"
apt-get update -qq
apt-get install -y -qq \
  nginx git curl unzip ca-certificates gnupg lsb-release \
  mysql-server redis-server supervisor certbot python3-certbot-nginx \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-redis php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-gd php8.3-intl php8.3-zip php8.3-bcmath \
  php8.3-opcache php8.3-readline

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Installing Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v composer >/dev/null 2>&1; then
  echo "==> Installing Composer"
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

echo "==> Enabling services"
systemctl enable --now nginx mysql redis-server php8.3-fpm supervisor

echo "==> MySQL database"
DB_NAME="saat"
DB_USER="saat"
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "==> Repository"
mkdir -p /var/www
if [[ -n "$REPO_URL" && ! -d "${GIT_ROOT}/.git" ]]; then
  git clone --branch "${BRANCH}" "${REPO_URL}" "${GIT_ROOT}"
fi

if [[ -d "${GIT_ROOT}/saat" ]]; then
  ln -sfn "${GIT_ROOT}/saat" "${APP_ROOT}"
elif [[ ! -e "${APP_ROOT}" ]]; then
  echo "ERROR: Expected ${GIT_ROOT}/saat — clone the monorepo or set GIT_ROOT"
  exit 1
fi

echo "==> Backend .env"
cd "${APP_ROOT}/backend"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env
sed -i "s|^APP_DEBUG=.*|APP_DEBUG=false|" .env
sed -i "s|^APP_URL=.*|APP_URL=${SITE_URL}|" .env
sed -i "s|^LOG_LEVEL=.*|LOG_LEVEL=warning|" .env
sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_NAME}|" .env
sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USER}|" .env
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" .env
sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${DOMAIN},www.${DOMAIN}|" .env
sed -i "s|^DEV_LOGIN_ENABLED=.*|DEV_LOGIN_ENABLED=false|" .env
sed -i "s|^DEMO_OTP_ENABLED=.*|DEMO_OTP_ENABLED=false|" .env
sed -i "s|^MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=\"noreply@${DOMAIN}\"|" .env
if [[ -n "$TELEGRAM_BOT_TOKEN" ]]; then
  sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}|" .env
fi
sed -i "s|^TELEGRAM_BOT_USERNAME=.*|TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}|" .env

# Production session cookie domain (force — .env.example may have SESSION_DOMAIN=null)
sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=.${DOMAIN}|" .env
grep -q '^SESSION_DOMAIN=' .env || echo "SESSION_DOMAIN=.${DOMAIN}" >> .env

composer install --no-dev --optimize-autoloader --no-interaction
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link || true
php artisan config:cache
php artisan route:cache

echo "==> Frontend production env"
cd "${APP_ROOT}/frontend"
if [[ ! -f .env.production ]]; then
  cp .env.production.example .env.production 2>/dev/null || true
fi
npm ci || npm install --no-audit --no-fund
VITE_UPDATE_TYPE=optional npm run build
cp -f public/version.json dist/version.json 2>/dev/null || true

echo "==> Nginx"
cp "${APP_ROOT}/deploy/nginx/sat-center.conf" /etc/nginx/sites-available/sat-center.conf
ln -sfn /etc/nginx/sites-available/sat-center.conf /etc/nginx/sites-enabled/sat-center.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Supervisor queue worker"
cp "${APP_ROOT}/deploy/supervisor/saat-queue.conf" /etc/supervisor/conf.d/saat-queue.conf
supervisorctl reread
supervisorctl update
supervisorctl start saat-queue:* || true

echo "==> SSL (Let's Encrypt)"
echo "Run: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo
echo "============================================"
echo "Saat bootstrap complete"
echo "APP_ROOT=${APP_ROOT}"
echo "SITE_URL=${SITE_URL}"
echo "DB_USER=${DB_USER}"
echo "DB_PASS=${DB_PASS}  (save this!)"
echo
echo "Next:"
echo "  1. Confirm TELEGRAM_BOT_TOKEN in backend/.env (shared @RostamiAppBot token)"
echo "  2. certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "  3. BotFather Mini App 'satcenter' Web App URL → ${SITE_URL}"
echo "  4. ./deploy/scripts/deploy.sh health"
echo "============================================"
