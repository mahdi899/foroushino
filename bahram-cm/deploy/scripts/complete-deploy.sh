#!/usr/bin/env bash
set -euo pipefail

GIT_ROOT="/var/www/foroushino"
APP_ROOT="/var/www/bahram-cm"
SITE_URL="https://fashio.ir"
CDN_URL="https://cdn.fashio.ir"

echo "==> Pull latest from GitHub"
git config --global --add safe.directory "$GIT_ROOT" || true
cd "$GIT_ROOT"
git pull --ff-only origin main

echo "==> Backend setup"
cd "$APP_ROOT/backend"
export COMPOSER_ALLOW_SUPERUSER=1

if [[ -f config/scribe.php ]]; then
  mv config/scribe.php config/scribe.php.dev
fi

sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env
sed -i "s|^APP_DEBUG=.*|APP_DEBUG=false|" .env
sed -i "s|^OTP_DEV_MODE=.*|OTP_DEV_MODE=false|" .env
sed -i "s|^LOG_LEVEL=.*|LOG_LEVEL=warning|" .env
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${SITE_URL}|" .env
sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${SITE_URL}|" .env
sed -i "s|^MEDIA_URL=.*|MEDIA_URL=${CDN_URL}|" .env

REVALIDATE_SECRET="$(grep '^REVALIDATE_SECRET=' .env | cut -d= -f2-)"

composer install --no-dev --optimize-autoloader --no-interaction

php artisan tinker --execute="
\$pending = ['2026_07_09_000030_create_push_subscriptions_table' => 'push_subscriptions'];
foreach (\$pending as \$migration => \$table) {
  if (Schema::hasTable(\$table) && !DB::table('migrations')->where('migration', \$migration)->exists()) {
    DB::table('migrations')->insert(['migration' => \$migration, 'batch' => (int) DB::table('migrations')->max('batch') + 1]);
  }
}
" 2>/dev/null || true

php artisan migrate --force
php artisan db:seed --class=RolePermissionSeeder --force || true
php artisan db:seed --class=DatabaseSeeder --force || true
php artisan db:seed --class=CacheIntegrationsSeeder --force || true
php artisan media:sync --import || true
php artisan media:sync --export || true
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Frontend setup"
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
  echo "npm ci failed — using npm install"
  npm install --no-audit --no-fund
fi
npm run build

echo "==> Permissions"
mkdir -p /var/log/pm2
chown -R www-data:www-data "$GIT_ROOT"
chmod -R ug+rw "$APP_ROOT/backend/storage" "$APP_ROOT/backend/bootstrap/cache"
# Keep .git usable for root deploys
chown -R root:root "$GIT_ROOT/.git"

echo "==> PM2"
pm2 delete bahram-frontend 2>/dev/null || true
pm2 start "$APP_ROOT/deploy/pm2/ecosystem.config.cjs"
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo "==> Supervisor"
cp "$APP_ROOT/deploy/supervisor/bahram-queue.conf" /etc/supervisor/conf.d/bahram-queue.conf
supervisorctl reread
supervisorctl update
supervisorctl restart bahram-queue:*

echo "==> Cron"
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
mkdir -p "$APP_ROOT/deploy/scripts"
cp /root/complete-deploy.sh "$APP_ROOT/deploy/scripts/complete-deploy.sh" 2>/dev/null || true
cat > /usr/local/bin/bahram-deploy <<'DEPLOY'
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/foroushino
git pull --ff-only origin main
bash /var/www/bahram-cm/deploy/scripts/deploy.sh
DEPLOY
chmod +x /usr/local/bin/bahram-deploy

echo "==> Diagnostics"
sleep 4
USER_COUNT=$(mysql -N -e "SELECT COUNT(*) FROM users;" bahram_backend 2>/dev/null || echo 0)
ADMIN_COUNT=$(mysql -N -e "SELECT COUNT(*) FROM users WHERE is_admin=1;" bahram_backend 2>/dev/null || echo 0)
MEDIA_COUNT=$(find "$APP_ROOT/backend/storage/app/public/media/site" -type f 2>/dev/null | wc -l || echo 0)

curl -sf http://127.0.0.1:8010/up >/dev/null && echo "Laravel /up: OK" || echo "Laravel /up: FAILED"
curl -sf -o /dev/null -w "Next.js: %{http_code}\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "Nginx /: %{http_code}\n" http://127.0.0.1/
curl -sf -o /dev/null -w "Admin: %{http_code}\n" http://127.0.0.1/admin
curl -sf -o /dev/null -w "Panel: %{http_code}\n" http://127.0.0.1/panel
curl -sf -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1/api/captcha/config
echo "Users: ${USER_COUNT}, Admins: ${ADMIN_COUNT}, Site media files: ${MEDIA_COUNT}"
pm2 list
supervisorctl status bahram-queue:* || true
echo "COMPLETE_DEPLOY_DONE"
