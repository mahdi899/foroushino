#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/saat}"
PHONE="${1:-09104085688}"
PASSWORD="${2:-}"

cd "${APP_DIR}/backend"

if ! php artisan list --raw 2>/dev/null | grep -q '^saat:set-staff-password'; then
  echo "ERROR: saat:set-staff-password command not found — deploy backend files first."
  exit 1
fi

if [[ -z "${PASSWORD}" ]]; then
  PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)"
  PASSWORD="Saat${PASSWORD}1"
fi

php artisan saat:set-staff-password "${PHONE}" --password="${PASSWORD}"
php artisan config:cache

echo "PHONE=${PHONE}"
echo "PASSWORD=${PASSWORD}"
