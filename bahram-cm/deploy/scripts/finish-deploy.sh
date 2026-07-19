#!/usr/bin/env bash
set -euo pipefail

GIT_ROOT="/var/www/foroushino"
APP_ROOT="/var/www/bahram-cm"
SITE_URL="https://rostami.app"
CDN_URL="https://cdn.rostami.app"
FAMILY_URL="https://rostami.club"
DB_NAME="bahram_backend"
DB_USER="bahram"
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
REVALIDATE_SECRET="$(openssl rand -hex 32)"
INTERNAL_SECRET="$(openssl rand -hex 32)"
HMAC_KEY="$(openssl rand -hex 32)"

mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';" 2>/dev/null || \
  mysql -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

cd "${APP_ROOT}/backend"
cp .env.example .env

# Scribe is dev-only; its config breaks `composer install --no-dev`
if [[ -f config/scribe.php ]]; then
  mv config/scribe.php config/scribe.php.dev
fi

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
sed -i "s|^CDN_PROVIDER=.*|CDN_PROVIDER=cloudflare|" .env
sed -i "s|^FAMILY_ENTRY_BASE_URL=.*|FAMILY_ENTRY_BASE_URL=${FAMILY_URL}|" .env
sed -i "s|^FAMILY_ENTRY_PATH=.*|FAMILY_ENTRY_PATH=|" .env

composer install --no-dev --optimize-autoloader --no-interaction
php artisan key:generate --force
php artisan migrate --force
# NOTE: intentionally NOT the full DatabaseSeeder — it seeds demo commerce,
# seminars, mini-courses, and a Family with hardcoded weak passwords
# (`password`, `12345`). CacheIntegrationsSeeder only wires real settings.
php artisan db:seed --class=CacheIntegrationsSeeder --force || true
php artisan db:seed --class=TelegramBotSeeder --force || true
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

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

npm ci
npm run build

mkdir -p /var/log/pm2
chown -R www-data:www-data "${GIT_ROOT}"
pm2 delete bahram-frontend 2>/dev/null || true
pm2 start "${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | tail -1 | bash || true

cp "${APP_ROOT}/deploy/supervisor/bahram-queue.conf" /etc/supervisor/conf.d/bahram-queue.conf
cp "${APP_ROOT}/deploy/supervisor/bahram-family-queue.conf" /etc/supervisor/conf.d/bahram-family-queue.conf
cp "${APP_ROOT}/backend/deploy/supervisor-telegram-horizon.conf.example" /etc/supervisor/conf.d/bahram-telegram-horizon.conf
supervisorctl reread
supervisorctl update
supervisorctl start bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler \
  || supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler || true

CRON_LINE="* * * * * cd ${APP_ROOT}/backend && php artisan schedule:run >> /dev/null 2>&1"
(crontab -u www-data -l 2>/dev/null | grep -v 'schedule:run' || true; echo "${CRON_LINE}") | crontab -u www-data -

mkdir -p /etc/nginx/conf.d
cp "${APP_ROOT}/deploy/nginx/conf.d/cloudflare-real-ip.conf" /etc/nginx/conf.d/cloudflare-real-ip.conf
cp "${APP_ROOT}/deploy/nginx/conf.d/rostami-upstreams.conf" /etc/nginx/conf.d/rostami-upstreams.conf
NGINX_SRC="/root/rostami-app-origin.conf"
[[ -f "${NGINX_SRC}" ]] || NGINX_SRC="${APP_ROOT}/deploy/nginx/rostami-app-origin.conf"
cp "${NGINX_SRC}" /etc/nginx/sites-available/rostami-app.conf
cp "${APP_ROOT}/deploy/nginx/rostami-club.conf" /etc/nginx/sites-available/rostami-club.conf
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/rostami-app.conf /etc/nginx/sites-enabled/rostami-app.conf
ln -sf /etc/nginx/sites-available/rostami-club.conf /etc/nginx/sites-enabled/rostami-club.conf
nginx -t
systemctl reload nginx

if grep -q '^TELEGRAM_BOT_TOKEN=.\+' "${APP_ROOT}/backend/.env"; then
  cd "${APP_ROOT}/backend"
  php artisan telegram:webhook:set production || true
fi

cat > /root/bahram-deploy-credentials.txt <<EOF
Bahram CM production — $(date -Iseconds)
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
REVALIDATE_SECRET=${REVALIDATE_SECRET}
INTERNAL_API_SECRET=${INTERNAL_SECRET}
SITE_URL=${SITE_URL}
FAMILY_URL=${FAMILY_URL}
No admin user was seeded (CacheIntegrationsSeeder only). Create the first
super-admin now:
  cd ${APP_ROOT}/backend && php artisan app:create-admin
EOF
chmod 600 /root/bahram-deploy-credentials.txt

sleep 5
curl -sf http://127.0.0.1:8010/up && echo " Laravel OK"
curl -sf -o /dev/null -w "Next.js: %{http_code}\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "Nginx: %{http_code}\n" http://127.0.0.1/
echo "COMPLETE"
