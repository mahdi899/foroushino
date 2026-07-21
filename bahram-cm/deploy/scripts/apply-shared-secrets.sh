#!/usr/bin/env bash
# Apply shared secrets on bahram-cm (run ON bahram server).
# Usage:
#   scp root@YOUR_SAAT_HOST:/root/bahram-sync-secrets.env /tmp/
#   source /tmp/bahram-sync-secrets.env
#   bash apply-shared-secrets.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
ENV_FILE="${APP_ROOT}/backend/.env"

: "${PROXY_SHARED_TOKEN:?Set PROXY_SHARED_TOKEN}"
: "${SAT_SYNC_HMAC_SECRET:?Set SAT_SYNC_HMAC_SECRET}"

KEYS=(PROXY_SHARED_TOKEN SAT_SYNC_HMAC_SECRET)
if [[ -n "${TELEGRAM_WEBHOOK_SECRET:-}" ]]; then
  KEYS+=(TELEGRAM_WEBHOOK_SECRET)
fi
if [[ -n "${TELEGRAM_WEBHOOK_BASE_URL:-}" ]]; then
  KEYS+=(TELEGRAM_WEBHOOK_BASE_URL)
fi

for key in "${KEYS[@]}"; do
  val="${!key}"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
done

cd "${APP_ROOT}/backend"
php artisan config:clear
php artisan config:cache

echo "Applied shared secrets to ${ENV_FILE}"
echo "Worker PROXY_SHARED_TOKEN must match PROXY_SHARED_TOKEN above."
