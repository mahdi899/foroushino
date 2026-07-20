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
  if ! git pull --ff-only origin main; then
    echo "WARN: git pull failed (no credentials?) — continuing with existing tree"
  fi
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
php artisan media:guard-directories
php artisan media:sync-hosts --import 2>/dev/null || true
php artisan family:refresh-demo 2>/dev/null || true

if [[ -f "$APP_ROOT/deploy/php-fpm/99-bahram-uploads.ini" ]]; then
  echo "==> PHP upload limits"
  cp "$APP_ROOT/deploy/php-fpm/99-bahram-uploads.ini" /etc/php/8.4/fpm/conf.d/99-bahram-uploads.ini
  systemctl reload php8.4-fpm 2>/dev/null || true
fi

if [[ -f "$APP_ROOT/deploy/nginx/snippets/media-cors.conf" ]]; then
  echo "==> Nginx media CORS"
  mkdir -p /etc/nginx/snippets /etc/nginx/conf.d
  cp "$APP_ROOT/deploy/nginx/snippets/media-cors.conf" /etc/nginx/snippets/media-cors.conf
  cp "$APP_ROOT/deploy/nginx/snippets/media-stream.conf" /etc/nginx/snippets/media-stream.conf
  cp "$APP_ROOT/deploy/nginx/conf.d/rostami-upstreams.conf" /etc/nginx/conf.d/rostami-upstreams.conf
  if [[ -f "$APP_ROOT/deploy/nginx/rostami-app.conf" && -f /etc/nginx/sites-available/rostami-app.conf ]]; then
    cp "$APP_ROOT/deploy/nginx/rostami-app.conf" /etc/nginx/sites-available/rostami-app.conf
  fi
  if [[ -f "$APP_ROOT/deploy/nginx/rostami-club.conf" && -f /etc/nginx/sites-available/rostami-club.conf ]]; then
    cp "$APP_ROOT/deploy/nginx/rostami-club.conf" /etc/nginx/sites-available/rostami-club.conf
  fi
  nginx -t && systemctl reload nginx
fi

echo "==> Frontend build"
cd "$APP_ROOT/frontend"
# devDependencies (e.g. @next/bundle-analyzer) are required for next.config.ts at build time.
unset NODE_ENV
if ! npm ci; then npm install --no-audit --no-fund; fi
export NODE_ENV=production
npm run build

echo "==> Reload PM2 (Next.js)"
PM2_CONFIG="$APP_ROOT/deploy/pm2/ecosystem.config.cjs"
pm2 reload "$PM2_CONFIG" --update-env || pm2 start "$PM2_CONFIG"

echo "==> Restart queue workers"
sudo supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null \
  || sudo supervisorctl restart bahram-queue:*

echo "==> OPcache reset (if available)"
php -r "if (function_exists('opcache_reset')) { opcache_reset(); echo 'OPcache reset'; }" || true

echo "==> Deploy complete"
