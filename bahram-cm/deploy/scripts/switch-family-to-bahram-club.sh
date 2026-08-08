#!/usr/bin/env bash
# Temporary: serve Family on https://bahram.club (rostami.club filtered in Iran).
# Revert: bash deploy/scripts/restore-family-club-domain.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
BACKEND="${APP_ROOT}/backend"
FRONTEND="${APP_ROOT}/frontend"
ENV_FILE="${BACKEND}/.env"
FE_ENV="${FRONTEND}/.env.local"
CERTBOT_WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-shokspy@gmail.com}"
FAMILY_DOMAIN="${FAMILY_DOMAIN:-bahram.club}"
FAMILY_URL="https://${FAMILY_DOMAIN}"

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

append_csv_env() {
  local key="$1" add="$2"
  local current
  current="$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [[ -z "$current" ]]; then
    echo "${key}=${add}" >> "$ENV_FILE"
    return
  fi
  if echo ",${current}," | grep -q ",${add},"; then
    return
  fi
  set_env "$key" "${current},${add}"
}

echo "=== Switch Family -> ${FAMILY_URL} $(date -Is) ==="

echo "==> SSL certificate for ${FAMILY_DOMAIN}"
mkdir -p "${CERTBOT_WEBROOT}"
if [[ ! -f "/etc/letsencrypt/live/${FAMILY_DOMAIN}/fullchain.pem" ]]; then
  certbot certonly --webroot \
    -w "${CERTBOT_WEBROOT}" \
    -d "${FAMILY_DOMAIN}" -d "www.${FAMILY_DOMAIN}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos --non-interactive --no-eff-email
else
  echo "cert already exists — skipping issuance"
fi

echo "==> Nginx vhost"
cp "${APP_ROOT}/deploy/nginx/bahram-club.conf" /etc/nginx/sites-available/bahram-club.conf
ln -sf /etc/nginx/sites-available/bahram-club.conf /etc/nginx/sites-enabled/bahram-club.conf
nginx -t
systemctl reload nginx

echo "==> Backend / frontend env"
set_env FAMILY_ENTRY_BASE_URL "${FAMILY_URL}"
set_env FAMILY_ENTRY_PATH ""
set_env VAPID_SUBJECT "${FAMILY_URL}"
append_csv_env CORS_ALLOWED_ORIGINS "${FAMILY_URL}"
append_csv_env SANCTUM_STATEFUL_DOMAINS "${FAMILY_DOMAIN}"

set_fe NEXT_PUBLIC_APP_DOMAIN rostami.app
set_fe NEXT_PUBLIC_FAMILY_DOMAIN "${FAMILY_DOMAIN}"
set_fe NEXT_PUBLIC_FAMILY_SITE_URL "${FAMILY_URL}"
set_fe NEXT_PUBLIC_SITE_URL https://rostami.app
set_fe NEXT_PUBLIC_API_BASE_URL https://rostami.app
set_fe NEXT_PUBLIC_MEDIA_URL https://cdn.rostami.app

cd "$BACKEND"
php artisan config:clear
php artisan config:cache
php artisan route:cache

bash "${APP_ROOT}/deploy/scripts/rebuild-frontend.sh"

echo "==> health"
curl -skI "${FAMILY_URL}/" | head -8
curl -skI "https://rostami.app/family" | head -6

echo "=== DONE — Family at ${FAMILY_URL} (temporary; rostami.club unchanged in nginx) ==="
