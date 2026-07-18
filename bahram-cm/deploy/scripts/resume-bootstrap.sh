#!/usr/bin/env bash
# Resume bootstrap after partial failure
set -euo pipefail

GIT_ROOT="/var/www/foroushino"
APP_ROOT="/var/www/bahram-cm"
SITE_URL="https://rostami.app"
CDN_URL="https://cdn.rostami.app"
FAMILY_URL="https://rostami.club"

# Read DB creds from existing .env if present
cd "${APP_ROOT}/backend"
if [[ ! -f .env ]]; then
  echo "Missing .env — run full bootstrap-server.sh"
  exit 1
fi

REVALIDATE_SECRET="$(grep '^REVALIDATE_SECRET=' .env | cut -d= -f2-)"
INTERNAL_SECRET="$(grep '^INTERNAL_API_SECRET=' .env | cut -d= -f2-)"

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
if [[ ! -f .env.local ]]; then
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
fi

echo "==> Frontend build"
npm ci
npm run build

echo "==> PM2"
mkdir -p /var/log/pm2
chown -R www-data:www-data "${GIT_ROOT}"
pm2 delete bahram-frontend 2>/dev/null || true
pm2 start "${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "==> Supervisor"
cp "${APP_ROOT}/deploy/supervisor/bahram-queue.conf" /etc/supervisor/conf.d/bahram-queue.conf
cp "${APP_ROOT}/deploy/supervisor/bahram-family-queue.conf" /etc/supervisor/conf.d/bahram-family-queue.conf
cp "${APP_ROOT}/backend/deploy/supervisor-telegram-horizon.conf.example" /etc/supervisor/conf.d/bahram-telegram-horizon.conf
supervisorctl reread
supervisorctl update
supervisorctl start bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler \
  || supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler || true

echo "==> Cron"
CRON_LINE="* * * * * cd ${APP_ROOT}/backend && php artisan schedule:run >> /dev/null 2>&1"
(crontab -u www-data -l 2>/dev/null | grep -v 'schedule:run' || true; echo "${CRON_LINE}") | crontab -u www-data -

echo "==> Nginx"
mkdir -p /etc/nginx/conf.d
cp "${APP_ROOT}/deploy/nginx/conf.d/rostami-upstreams.conf" /etc/nginx/conf.d/rostami-upstreams.conf
NGINX_SRC="${APP_ROOT}/deploy/nginx/rostami-app-origin.conf"
[[ -f "${NGINX_SRC}" ]] || NGINX_SRC="/root/rostami-app-origin.conf"
cp "${NGINX_SRC}" /etc/nginx/sites-available/rostami-app.conf
cp "${APP_ROOT}/deploy/nginx/rostami-club.conf" /etc/nginx/sites-available/rostami-club.conf
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/rostami-app.conf /etc/nginx/sites-enabled/rostami-app.conf
ln -sf /etc/nginx/sites-available/rostami-club.conf /etc/nginx/sites-enabled/rostami-club.conf
nginx -t
systemctl reload nginx

echo "==> Health checks"
sleep 3
curl -sf http://127.0.0.1:8010/up >/dev/null && echo "Laravel /up: OK" || echo "Laravel /up: FAILED"
curl -sf http://127.0.0.1:3000/ >/dev/null && echo "Next.js :3000: OK" || echo "Next.js :3000: FAILED"
curl -sf http://127.0.0.1/ >/dev/null && echo "Nginx proxy: OK" || echo "Nginx proxy: FAILED"
echo "DONE"
