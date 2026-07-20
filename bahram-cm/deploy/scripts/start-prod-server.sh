#!/usr/bin/env bash
# Restore Bahram + Family to PRODUCTION mode (next build + next start).
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
BACKEND="${APP_ROOT}/backend"
FRONTEND="${APP_ROOT}/frontend"
ENV_FILE="${BACKEND}/.env"
PM2_PROD="${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
FLAG="/var/www/.bahram-dev-mode"

echo "=== Bahram/Family PRODUCTION mode $(date -Is) ==="

if [[ -f "${ENV_FILE}.prod.bak" ]]; then
  cp "${ENV_FILE}.prod.bak" "$ENV_FILE"
  echo "Restored ${ENV_FILE} from prod backup"
fi

set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_env APP_ENV production
set_env APP_DEBUG false
set_env FAMILY_MEDIA_DISK family_media_ftp
set_env MEDIA_DISK site_media_ftp

FE_ENV="${FRONTEND}/.env.local"
touch "$FE_ENV"
grep -q '^NEXT_PUBLIC_APP_DOMAIN=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=rostami.app|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_APP_DOMAIN=rostami.app' >> "$FE_ENV"
grep -q '^NEXT_PUBLIC_FAMILY_DOMAIN=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_FAMILY_DOMAIN=.*|NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club' >> "$FE_ENV"
grep -q '^NEXT_PUBLIC_SITE_URL=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://rostami.app|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_SITE_URL=https://rostami.app' >> "$FE_ENV"
grep -q '^NEXT_PUBLIC_API_BASE_URL=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_API_BASE_URL=.*|NEXT_PUBLIC_API_BASE_URL=https://rostami.app|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_API_BASE_URL=https://rostami.app' >> "$FE_ENV"
grep -q '^NEXT_PUBLIC_MEDIA_URL=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_MEDIA_URL=.*|NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app' >> "$FE_ENV"

cd "$BACKEND"
composer install --no-dev --optimize-autoloader --no-interaction
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwx storage bootstrap/cache
php artisan config:clear
php artisan cache:clear || true
php artisan migrate --force

pm2 delete bahram-frontend 2>/dev/null || true
pkill -f 'next dev' 2>/dev/null || true
pkill -f 'next build' 2>/dev/null || true
pm2 stop all 2>/dev/null || true
sleep 2

if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 2>/dev/null
  chmod 600 /swapfile
  mkswap /swapfile 2>/dev/null || true
  swapon /swapfile 2>/dev/null || true
fi

cd "$FRONTEND"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
rm -rf .next
npm run build
test -f .next/BUILD_ID

pm2 start "$PM2_PROD" --update-env || pm2 reload "$PM2_PROD" --update-env
pm2 restart family-manager-web 2>/dev/null || true
pm2 save

rm -f "$FLAG"

echo "--- health ---"
curl -skI http://127.0.0.1:3000/ | head -3 || true
pm2 list
echo "=== PRODUCTION mode active ==="
