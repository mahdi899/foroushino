#!/usr/bin/env bash
set -euo pipefail

GIT_ROOT="/var/www/foroushino"
APP_ROOT="/var/www/bahram-cm"
SITE_URL="https://fashio.ir"
CDN_URL="https://cdn.fashio.ir"

echo "==> Pull latest from GitHub"
cd "$GIT_ROOT"
git pull --ff-only origin main

echo "==> Backend: scribe dev-only fix"
cd "$APP_ROOT/backend"
if [[ -f config/scribe.php ]]; then
  mv config/scribe.php config/scribe.php.dev
fi

echo "==> Backend: production env"
if [[ ! -f .env ]]; then
  cp .env.example .env
  DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  REVALIDATE_SECRET="$(openssl rand -hex 32)"
  INTERNAL_SECRET="$(openssl rand -hex 32)"
  HMAC_KEY="$(openssl rand -hex 32)"
  mysql -e "CREATE DATABASE IF NOT EXISTS \`bahram_backend\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -e "CREATE USER IF NOT EXISTS 'bahram'@'localhost' IDENTIFIED BY '${DB_PASS}';"
  mysql -e "GRANT ALL PRIVILEGES ON \`bahram_backend\`.* TO 'bahram'@'localhost'; FLUSH PRIVILEGES;"
  sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env
  sed -i "s|^APP_DEBUG=.*|APP_DEBUG=false|" .env
  sed -i "s|^APP_URL=.*|APP_URL=http://127.0.0.1:8010|" .env
  sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${SITE_URL}|" .env
  sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${SITE_URL}|" .env
  sed -i "s|^LOG_LEVEL=.*|LOG_LEVEL=warning|" .env
  sed -i "s|^LOG_CHANNEL=.*|LOG_CHANNEL=daily|" .env
  sed -i "s|^DB_DATABASE=.*|DB_DATABASE=bahram_backend|" .env
  sed -i "s|^DB_USERNAME=.*|DB_USERNAME=bahram|" .env
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" .env
  sed -i "s|^SESSION_DRIVER=.*|SESSION_DRIVER=redis|" .env
  sed -i "s|^SESSION_SECURE_COOKIE=.*|SESSION_SECURE_COOKIE=true|" .env
  sed -i "s|^CACHE_STORE=.*|CACHE_STORE=redis|" .env
  sed -i "s|^QUEUE_CONNECTION=.*|QUEUE_CONNECTION=redis|" .env
  sed -i "s|^OTP_DEV_MODE=.*|OTP_DEV_MODE=false|" .env
  sed -i "s|^REVALIDATE_SECRET=.*|REVALIDATE_SECRET=${REVALIDATE_SECRET}|" .env
  sed -i "s|^REVALIDATE_WEBHOOK_URL=.*|REVALIDATE_WEBHOOK_URL=${SITE_URL}/api/revalidate|" .env
  sed -i "s|^INTERNAL_API_SECRET=.*|INTERNAL_API_SECRET=${INTERNAL_SECRET}|" .env
  sed -i "s|^IDENTITY_NATIONAL_CODE_HMAC_KEY=.*|IDENTITY_NATIONAL_CODE_HMAC_KEY=${HMAC_KEY}|" .env
  sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=fashio.ir|" .env
  sed -i "s|^MEDIA_URL=.*|MEDIA_URL=${CDN_URL}|" .env
  sed -i "s|^CDN_PROVIDER=.*|CDN_PROVIDER=arvan|" .env
  php artisan key:generate --force
else
  sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env
  sed -i "s|^APP_DEBUG=.*|APP_DEBUG=false|" .env
  sed -i "s|^OTP_DEV_MODE=.*|OTP_DEV_MODE=false|" .env
  sed -i "s|^LOG_LEVEL=.*|LOG_LEVEL=warning|" .env
fi

REVALIDATE_SECRET="$(grep '^REVALIDATE_SECRET=' .env | cut -d= -f2-)"

echo "==> Backend: composer + migrate"
export COMPOSER_ALLOW_SUPERUSER=1
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force || true
# Fix orphaned tables from partial bootstrap
php artisan tinker --execute="
\$pending = ['2026_07_09_000030_create_push_subscriptions_table' => 'push_subscriptions'];
foreach (\$pending as \$migration => \$table) {
  if (Schema::hasTable(\$table) && !DB::table('migrations')->where('migration', \$migration)->exists()) {
    DB::table('migrations')->insert(['migration' => \$migration, 'batch' => (int) DB::table('migrations')->max('batch') + 1]);
  }
}
" 2>/dev/null || true
php artisan migrate --force || true
php artisan db:seed --class=CacheIntegrationsSeeder --force || true
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Frontend: env + build"
cd "$APP_ROOT/frontend"
if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
fi
sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${SITE_URL}|" .env.local
sed -i "s|^NEXT_PUBLIC_API_BASE_URL=.*|NEXT_PUBLIC_API_BASE_URL=${SITE_URL}|" .env.local
sed -i "s|^BACKEND_PROXY_URL=.*|BACKEND_PROXY_URL=http://127.0.0.1:8010|" .env.local
sed -i "s|^NEXT_PUBLIC_CDN_ORIGIN=.*|NEXT_PUBLIC_CDN_ORIGIN=${CDN_URL}|" .env.local
sed -i "s|^REVALIDATE_SECRET=.*|REVALIDATE_SECRET=${REVALIDATE_SECRET}|" .env.local
if ! npm ci; then
  echo "npm ci failed — falling back to npm install"
  npm install --no-audit --no-fund
fi
npm run build

echo "==> PM2"
mkdir -p /var/log/pm2
chown -R www-data:www-data "$GIT_ROOT"
pm2 delete bahram-frontend 2>/dev/null || true
pm2 start "$APP_ROOT/deploy/pm2/ecosystem.config.cjs"
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "==> Supervisor queue"
cp "$APP_ROOT/deploy/supervisor/bahram-queue.conf" /etc/supervisor/conf.d/bahram-queue.conf
supervisorctl reread
supervisorctl update
supervisorctl start bahram-queue:* || supervisorctl restart bahram-queue:*

echo "==> Cron scheduler"
CRON_LINE="* * * * * cd ${APP_ROOT}/backend && php artisan schedule:run >> /dev/null 2>&1"
(crontab -u www-data -l 2>/dev/null | grep -v 'schedule:run' || true; echo "${CRON_LINE}") | crontab -u www-data -

echo "==> Nginx"
NGINX_SRC="$APP_ROOT/deploy/nginx/fashio-origin.conf"
[[ -f "$NGINX_SRC" ]] || NGINX_SRC="/root/fashio-origin.conf"
cp "$NGINX_SRC" /etc/nginx/sites-available/fashio.conf
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/fashio.conf /etc/nginx/sites-enabled/fashio.conf
nginx -t
systemctl reload nginx

echo "==> Deploy helper"
cat > /usr/local/bin/bahram-deploy <<'DEPLOY'
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/foroushino
git pull --ff-only origin main
bash /var/www/bahram-cm/deploy/scripts/deploy.sh
DEPLOY
chmod +x /usr/local/bin/bahram-deploy

echo "==> Health checks"
sleep 5
curl -sf http://127.0.0.1:8010/up && echo " Laravel /up: OK" || echo " Laravel /up: FAILED"
curl -sf -o /dev/null -w "Next.js: %{http_code}\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "Nginx: %{http_code}\n" http://127.0.0.1/
pm2 list
supervisorctl status bahram-queue:* || true
echo "DEPLOY_COMPLETE"
