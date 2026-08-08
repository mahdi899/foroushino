#!/usr/bin/env bash
# Restore Family to rostami.club apex (Option B dual-domain).
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
  if grep -q "^${key}=" "$FE_ENV" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$FE_ENV"
  else
    echo "${key}=${val}" >> "$FE_ENV"
  fi
}

echo "=== Restore Family -> rostami.club $(date -Is) ==="

set_env FAMILY_ENTRY_BASE_URL https://rostami.club
set_env FAMILY_ENTRY_PATH ""

set_fe NEXT_PUBLIC_APP_DOMAIN rostami.app
set_fe NEXT_PUBLIC_FAMILY_DOMAIN rostami.club
set_fe NEXT_PUBLIC_FAMILY_SITE_URL https://rostami.club
set_fe NEXT_PUBLIC_SITE_URL https://rostami.app
set_fe NEXT_PUBLIC_API_BASE_URL https://rostami.app
set_fe NEXT_PUBLIC_MEDIA_URL https://cdn.rostami.app

cd "$BACKEND"
php artisan config:clear
php artisan config:cache
php artisan route:cache

bash "${APP_ROOT}/deploy/scripts/rebuild-frontend.sh"

echo "=== DONE — club apex restored (rostami.club) ==="
