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

cd "$BACKEND"
composer install --no-dev --optimize-autoloader --no-interaction
php artisan config:clear
php artisan cache:clear || true
php artisan migrate --force

pm2 delete bahram-frontend 2>/dev/null || true
pkill -f 'next dev' 2>/dev/null || true
sleep 2

cd "$FRONTEND"
npm run build
test -f .next/BUILD_ID

pm2 start "$PM2_PROD" --update-env || pm2 reload "$PM2_PROD" --update-env
pm2 save

rm -f "$FLAG"

echo "--- health ---"
curl -skI http://127.0.0.1:3000/ | head -3 || true
pm2 list
echo "=== PRODUCTION mode active ==="
