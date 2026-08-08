#!/usr/bin/env bash
# Temporary: serve Family on https://rostami.app/family when rostami.club is filtered/unreachable.
# Revert: set NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club, FAMILY_ENTRY_BASE_URL=https://rostami.club, FAMILY_ENTRY_PATH=
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
BACKEND="${APP_ROOT}/backend"
FRONTEND="${APP_ROOT}/frontend"
ENV_FILE="${BACKEND}/.env"
FE_ENV="${FRONTEND}/.env.local"

set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_fe() {
  local key="$1" val="$2"
  touch "$FE_ENV"
  if [[ -z "$val" ]]; then
    sed -i "/^${key}=/d" "$FE_ENV" 2>/dev/null || true
    return
  fi
  if grep -q "^${key}=" "$FE_ENV" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$FE_ENV"
  else
    echo "${key}=${val}" >> "$FE_ENV"
  fi
}

echo "=== Switch Family entry -> rostami.app/family $(date -Is) ==="

set_env FAMILY_ENTRY_BASE_URL https://rostami.app
set_env FAMILY_ENTRY_PATH family

set_fe NEXT_PUBLIC_APP_DOMAIN rostami.app
set_fe NEXT_PUBLIC_FAMILY_DOMAIN ""
set_fe NEXT_PUBLIC_FAMILY_SITE_URL ""
set_fe NEXT_PUBLIC_SITE_URL https://rostami.app
set_fe NEXT_PUBLIC_API_BASE_URL https://rostami.app
set_fe NEXT_PUBLIC_MEDIA_URL https://cdn.rostami.app

echo "==> backend caches"
cd "$BACKEND"
php artisan config:clear
php artisan config:cache
php artisan route:cache

echo "==> frontend rebuild"
cd "$FRONTEND"
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
unset NEXT_DEPLOY_REV
npm run typecheck
rm -rf .next
npm run build
test -f .next/BUILD_ID

PM2_CONFIG="${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
pm2 reload "$PM2_CONFIG" --update-env || pm2 start "$PM2_CONFIG"
sleep 3
rm -rf /var/cache/nginx/rostami_next/* 2>/dev/null || true

echo "==> health"
curl -skI https://rostami.app/family | head -6
echo "=== DONE — Family at https://rostami.app/family (no redirect to rostami.club) ==="
