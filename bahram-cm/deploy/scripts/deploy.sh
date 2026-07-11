#!/usr/bin/env bash
# Bahram CM — production deploy script (Ubuntu self-hosted)
# Usage: ./deploy/scripts/deploy.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
cd "$APP_ROOT"

echo "==> Pull latest code"
GIT_ROOT="${GIT_ROOT:-/var/www/foroushino}"
if [[ -d "${GIT_ROOT}/.git" ]]; then
  cd "$GIT_ROOT"
  git pull --ff-only origin main
fi
APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
cd "$APP_ROOT"

echo "==> Backend dependencies"
cd "$APP_ROOT/backend"
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Run migrations"
php artisan migrate --force

echo "==> Laravel production caches"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Storage link (idempotent)"
php artisan storage:link 2>/dev/null || true

echo "==> Frontend build"
cd "$APP_ROOT/frontend"
npm ci
npm run build

echo "==> Reload PM2 (Next.js)"
pm2 reload deploy/pm2/ecosystem.config.cjs --update-env || pm2 start deploy/pm2/ecosystem.config.cjs

echo "==> Restart queue workers"
sudo supervisorctl restart bahram-queue:*

echo "==> OPcache reset (if available)"
php -r "if (function_exists('opcache_reset')) { opcache_reset(); echo 'OPcache reset'; }" || true

echo "==> Deploy complete"
