#!/usr/bin/env bash
# Bahram CM — first-time production bootstrap (Ubuntu 22.04/24.04)
# Usage: sudo bash bootstrap-server.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

GIT_ROOT="${GIT_ROOT:-/var/www/foroushino}"
APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
REPO_URL="${REPO_URL:-https://github.com/mahdi899/foroushino.git}"
BRANCH="${BRANCH:-main}"
SITE_URL="${SITE_URL:-https://rostami.app}"
CDN_URL="${CDN_URL:-https://cdn.rostami.app}"
# Option B — true dual-domain: Family PWA on its own apex.
FAMILY_URL="${FAMILY_URL:-https://rostami.club}"
FAMILY_CDN_URL="${FAMILY_CDN_URL:-https://family-cdn.rostami.club}"
# Shared bot @RostamiAppBot — also verified by saat/backend (Mini App "satcenter").
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_BOT_USERNAME="${TELEGRAM_BOT_USERNAME:-RostamiAppBot}"

echo "==> Installing system packages"
apt-get update -qq
apt-get install -y -qq \
  nginx git curl unzip ca-certificates gnupg lsb-release \
  mysql-server redis-server supervisor \
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

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
fi

echo "==> Enabling services"
systemctl enable --now nginx mysql redis-server php8.3-fpm supervisor

echo "==> MySQL database"
DB_NAME="bahram_backend"
DB_USER="bahram"
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

echo "==> Clone repository"
mkdir -p /var/www
if [[ ! -d "${GIT_ROOT}/.git" ]]; then
  git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${GIT_ROOT}"
fi
ln -sfn "${GIT_ROOT}/bahram-cm" "${APP_ROOT}"

echo "==> Generate secrets"
REVALIDATE_SECRET="$(openssl rand -hex 32)"
INTERNAL_SECRET="$(openssl rand -hex 32)"
HMAC_KEY="$(openssl rand -hex 32)"

echo "==> Backend .env"
cd "${APP_ROOT}/backend"
cp .env.example .env

sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env
sed -i "s|^APP_DEBUG=.*|APP_DEBUG=false|" .env
sed -i "s|^APP_URL=.*|APP_URL=http://127.0.0.1:8010|" .env
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${SITE_URL}|" .env
sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${SITE_URL},${FAMILY_URL}|" .env
sed -i "s|^LOG_LEVEL=.*|LOG_LEVEL=warning|" .env
sed -i "s|^LOG_CHANNEL=.*|LOG_CHANNEL=daily|" .env
sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_NAME}|" .env
sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USER}|" .env
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" .env
sed -i "s|^SESSION_DRIVER=.*|SESSION_DRIVER=redis|" .env
sed -i "s|^SESSION_SECURE_COOKIE=.*|SESSION_SECURE_COOKIE=true|" .env
sed -i "s|^CACHE_STORE=.*|CACHE_STORE=redis|" .env
sed -i "s|^QUEUE_CONNECTION=.*|QUEUE_CONNECTION=redis|" .env
sed -i "s|^OTP_DEV_MODE=.*|OTP_DEV_MODE=false|" .env
grep -q '^OTP_SKIP_ADMIN=' .env && sed -i "s|^OTP_SKIP_ADMIN=.*|OTP_SKIP_ADMIN=false|" .env || echo "OTP_SKIP_ADMIN=false" >> .env
grep -q '^PAYMENT_DEV_MODE=' .env && sed -i "s|^PAYMENT_DEV_MODE=.*|PAYMENT_DEV_MODE=false|" .env || echo "PAYMENT_DEV_MODE=false" >> .env
sed -i "s|^REVALIDATE_SECRET=.*|REVALIDATE_SECRET=${REVALIDATE_SECRET}|" .env
sed -i "s|^REVALIDATE_WEBHOOK_URL=.*|REVALIDATE_WEBHOOK_URL=${SITE_URL}/api/revalidate|" .env
sed -i "s|^INTERNAL_API_SECRET=.*|INTERNAL_API_SECRET=${INTERNAL_SECRET}|" .env
sed -i "s|^IDENTITY_NATIONAL_CODE_HMAC_KEY=.*|IDENTITY_NATIONAL_CODE_HMAC_KEY=${HMAC_KEY}|" .env
sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${SITE_URL#https://},${FAMILY_URL#https://}|" .env
sed -i "s|^MEDIA_URL=.*|MEDIA_URL=${CDN_URL}|" .env
sed -i "s|^CDN_PROVIDER=.*|CDN_PROVIDER=arvan|" .env
sed -i "s|^ARVAN_DOMAIN=.*|ARVAN_DOMAIN=${SITE_URL#https://}|" .env
sed -i "s|^ARVAN_MEDIA_DOMAIN=.*|ARVAN_MEDIA_DOMAIN=${CDN_URL#https://}|" .env
sed -i "s|^FAMILY_ENTRY_BASE_URL=.*|FAMILY_ENTRY_BASE_URL=${FAMILY_URL}|" .env
sed -i "s|^FAMILY_ENTRY_PATH=.*|FAMILY_ENTRY_PATH=|" .env
sed -i "s|^FAMILY_MEDIA_CDN_URL=.*|FAMILY_MEDIA_CDN_URL=${FAMILY_CDN_URL}|" .env
sed -i "s|^TELEGRAM_WEBHOOK_BASE_URL=.*|TELEGRAM_WEBHOOK_BASE_URL=${SITE_URL}|" .env
sed -i "s|^TELEGRAM_SITE_BASE_URL=.*|TELEGRAM_SITE_BASE_URL=${SITE_URL}|" .env
if [[ -n "$TELEGRAM_BOT_TOKEN" ]]; then
  sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}|" .env
fi
sed -i "s|^TELEGRAM_BOT_USERNAME=.*|TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}|" .env

echo "==> Composer install"
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Laravel setup"
php artisan key:generate --force
php artisan migrate --force
php artisan db:seed --class=CacheIntegrationsSeeder --force || true
php artisan db:seed --class=TelegramBotSeeder --force || true
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Frontend .env.local"
cd "${APP_ROOT}/frontend"
cp .env.example .env.local
sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${SITE_URL}|" .env.local
sed -i "s|^NEXT_PUBLIC_API_BASE_URL=.*|NEXT_PUBLIC_API_BASE_URL=${SITE_URL}|" .env.local
sed -i "s|^BACKEND_PROXY_URL=.*|BACKEND_PROXY_URL=http://127.0.0.1:8010|" .env.local
sed -i "s|^NEXT_PUBLIC_CDN_ORIGIN=.*|NEXT_PUBLIC_CDN_ORIGIN=${CDN_URL}|" .env.local
sed -i "s|^REVALIDATE_SECRET=.*|REVALIDATE_SECRET=${REVALIDATE_SECRET}|" .env.local
grep -q '^NEXT_PUBLIC_APP_DOMAIN=' .env.local \
  && sed -i "s|^NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=${SITE_URL#https://}|" .env.local \
  || echo "NEXT_PUBLIC_APP_DOMAIN=${SITE_URL#https://}" >> .env.local
grep -q '^NEXT_PUBLIC_FAMILY_DOMAIN=' .env.local \
  && sed -i "s|^NEXT_PUBLIC_FAMILY_DOMAIN=.*|NEXT_PUBLIC_FAMILY_DOMAIN=${FAMILY_URL#https://}|" .env.local \
  || echo "NEXT_PUBLIC_FAMILY_DOMAIN=${FAMILY_URL#https://}" >> .env.local

echo "==> Frontend build"
npm ci
npm run build

echo "==> PM2"
mkdir -p /var/log/pm2
chown -R www-data:www-data "${GIT_ROOT}"
# PM2 runs as root initially; app files owned by www-data for uploads
pm2 delete bahram-frontend 2>/dev/null || true
pm2 start "${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "==> Supervisor queue workers"
cp "${APP_ROOT}/deploy/supervisor/bahram-queue.conf" /etc/supervisor/conf.d/bahram-queue.conf
cp "${APP_ROOT}/deploy/supervisor/bahram-family-queue.conf" /etc/supervisor/conf.d/bahram-family-queue.conf
cp "${APP_ROOT}/backend/deploy/supervisor-telegram-horizon.conf.example" /etc/supervisor/conf.d/bahram-telegram-horizon.conf
supervisorctl reread
supervisorctl update
supervisorctl start bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler \
  || supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler || true

echo "==> Laravel scheduler cron"
CRON_LINE="* * * * * cd ${APP_ROOT}/backend && php artisan schedule:run >> /dev/null 2>&1"
(crontab -u www-data -l 2>/dev/null | grep -v 'schedule:run' || true; echo "${CRON_LINE}") | crontab -u www-data -

echo "==> Deploy script (git pull from repo root)"
cat > /usr/local/bin/bahram-deploy <<'DEPLOY'
#!/usr/bin/env bash
set -euo pipefail
GIT_ROOT="/var/www/foroushino"
APP_ROOT="/var/www/bahram-cm"
cd "$GIT_ROOT"
git pull --ff-only origin main
cd "$APP_ROOT"
bash deploy/scripts/deploy.sh
DEPLOY
chmod +x /usr/local/bin/bahram-deploy

echo "==> Nginx (rostami.app + rostami.club — Option B dual-domain)"
mkdir -p /etc/nginx/conf.d
cp "${APP_ROOT}/deploy/nginx/conf.d/rostami-upstreams.conf" /etc/nginx/conf.d/rostami-upstreams.conf
NGINX_SRC="${APP_ROOT}/deploy/nginx/rostami-app-origin.conf"
if [[ ! -f "${NGINX_SRC}" && -f /root/rostami-app-origin.conf ]]; then
  NGINX_SRC="/root/rostami-app-origin.conf"
fi
cp "${NGINX_SRC}" /etc/nginx/sites-available/rostami-app.conf
cp "${APP_ROOT}/deploy/nginx/rostami-club.conf" /etc/nginx/sites-available/rostami-club.conf
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/rostami-app.conf /etc/nginx/sites-enabled/rostami-app.conf
ln -sf /etc/nginx/sites-available/rostami-club.conf /etc/nginx/sites-enabled/rostami-club.conf
nginx -t
systemctl reload nginx

echo "==> Telegram webhook (shared @${TELEGRAM_BOT_USERNAME})"
cd "${APP_ROOT}/backend"
php artisan telegram:sync-bots || true
php artisan telegram:webhook:set production || echo "WARN: set webhook manually — php artisan telegram:webhook:set production"

echo "==> Save credentials"
CREDS="/root/bahram-deploy-credentials.txt"
cat > "${CREDS}" <<EOF
Bahram CM production credentials — $(date -Iseconds)
Git root: ${GIT_ROOT}
App root: ${APP_ROOT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
REVALIDATE_SECRET=${REVALIDATE_SECRET}
INTERNAL_API_SECRET=${INTERNAL_SECRET}
SITE_URL=${SITE_URL}
FAMILY_URL=${FAMILY_URL}
EOF
chmod 600 "${CREDS}"

echo "==> Health checks"
sleep 3
curl -sf http://127.0.0.1:8010/up >/dev/null && echo "Laravel /up: OK" || echo "Laravel /up: FAILED"
curl -sf http://127.0.0.1:3000/ >/dev/null && echo "Next.js :3000: OK" || echo "Next.js :3000: FAILED"
curl -sf http://127.0.0.1/ >/dev/null && echo "Nginx proxy: OK" || echo "Nginx proxy: FAILED"

echo ""
echo "============================================"
echo "Bootstrap complete!"
echo "Credentials saved to: ${CREDS}"
echo "Main site: ${SITE_URL} (via Arvan CDN → origin ${SITE_URL%://*})"
echo "Family PWA: ${FAMILY_URL} (direct TLS on origin — certbot -d ${FAMILY_URL#https://})"
echo "Direct IP test: http://185.130.50.24"
echo ""
echo "Next:"
echo "  1. certbot --nginx -d ${SITE_URL#https://} -d www.${SITE_URL#https://} -d ${CDN_URL#https://}"
echo "  2. certbot --nginx -d ${FAMILY_URL#https://} -d www.${FAMILY_URL#https://} -d ${FAMILY_CDN_URL#https://}"
echo "  3. Confirm TELEGRAM_BOT_TOKEN in backend/.env, then: php artisan telegram:webhook:info production"
echo "  4. saat (sat.center) is a SEPARATE app — see saat/deploy/DEPLOYMENT.md"
echo "============================================"
