#!/usr/bin/env bash
# Switch Bahram + Family stack on origin to DEVELOPMENT mode (next dev — no production build).
# Usage on server: bash /var/www/bahram-cm/deploy/scripts/start-dev-server.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
GIT_ROOT="${GIT_ROOT:-/var/www/foroushino}"
BACKEND="${APP_ROOT}/backend"
FRONTEND="${APP_ROOT}/frontend"
ENV_FILE="${BACKEND}/.env"
FE_ENV="${FRONTEND}/.env.local"
PM2_DEV="${APP_ROOT}/deploy/pm2/ecosystem.dev.config.cjs"
FLAG="/var/www/.bahram-dev-mode"

echo "=== Bahram/Family DEV mode $(date -Is) ==="

set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

# Backup production .env flags once
if [[ ! -f "${ENV_FILE}.prod.bak" ]]; then
  cp "$ENV_FILE" "${ENV_FILE}.prod.bak"
  echo "Backed up ${ENV_FILE} -> ${ENV_FILE}.prod.bak"
fi

echo "==> Laravel dev-friendly settings"
set_env APP_ENV local
set_env APP_DEBUG true
set_env LOG_LEVEL debug

echo "==> Media CDN (dev on server still uses real domains)"
set_env FAMILY_MEDIA_DISK public
grep -q '^FAMILY_MEDIA_CDN_URL=' "$ENV_FILE" || set_env FAMILY_MEDIA_CDN_URL https://cdn.rostami.app
grep -q '^MEDIA_URL=' "$ENV_FILE" || set_env MEDIA_URL https://cdn.rostami.app

echo "==> Frontend env"
touch "$FE_ENV"
grep -q '^NEXT_PUBLIC_MEDIA_URL=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_MEDIA_URL=.*|NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app' >> "$FE_ENV"

grep -q '^NEXT_PUBLIC_APP_DOMAIN=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=rostami.app|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_APP_DOMAIN=rostami.app' >> "$FE_ENV"

grep -q '^NEXT_PUBLIC_FAMILY_DOMAIN=' "$FE_ENV" \
  && sed -i 's|^NEXT_PUBLIC_FAMILY_DOMAIN=.*|NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club|' "$FE_ENV" \
  || echo 'NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club' >> "$FE_ENV"

echo "==> Backend deps + cache (light — skip heavy cache:clear if redis down)"
cd "$BACKEND"
composer install --optimize-autoloader --no-interaction --prefer-dist
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan storage:link 2>/dev/null || true
php artisan media:sync 2>/dev/null || true
php artisan tinker --execute="Illuminate\Support\Facades\Cache::forget('family:branding:public');" 2>/dev/null || true

echo "==> Frontend deps (skip if node_modules exists)"
cd "$FRONTEND"
if [[ ! -d node_modules ]]; then
  npm install --prefer-offline --no-audit
fi

echo "==> Stop production Next (build not required in dev)"
pm2 delete bahram-frontend 2>/dev/null || true
pkill -f 'next start' 2>/dev/null || true
pkill -f 'next build' 2>/dev/null || true
sleep 2

echo "==> Start PM2 dev stack"
pm2 start "$PM2_DEV" --update-env
pm2 save

touch "$FLAG"
echo "dev" > "$FLAG"

echo "==> Wait for next dev"
for i in $(seq 1 30); do
  if curl -sf -o /dev/null --max-time 3 http://127.0.0.1:3000/; then
    echo "Next dev ready after ${i}s"
    break
  fi
  sleep 2
done

echo "--- health ---"
curl -skI http://127.0.0.1:3000/ | head -3 || true
curl -skI http://127.0.0.1:8010/up | head -3 || true
curl -sk https://rostami.app/api/v1/family/branding | head -c 300 || true
echo
pm2 list
echo "=== DEV mode active. To restore production: bash ${APP_ROOT}/deploy/scripts/start-prod-server.sh ==="
