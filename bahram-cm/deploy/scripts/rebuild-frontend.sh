#!/usr/bin/env bash
# Rebuild Next.js frontend (rostami.app + rostami.club /family) on the Bahram server.
# Run locally ON the server, or via: python deploy/scripts/remote-rebuild-frontend.py
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
GIT_ROOT="${GIT_ROOT:-/var/www/foroushino}"
FRONTEND="${FRONTEND:-${APP_ROOT}/frontend}"
LOG="${LOG:-/tmp/bahram-frontend-rebuild.log}"

exec > >(tee "$LOG") 2>&1
echo "=== Bahram/Family frontend rebuild $(date -Is) ==="
echo "APP_ROOT=$APP_ROOT FRONTEND=$FRONTEND"

# Stop crash-loop while .next is missing
pm2 stop bahram-frontend 2>/dev/null || true
pkill -f 'next build' 2>/dev/null || true
pkill -f 'npm run build' 2>/dev/null || true
rm -f "${FRONTEND}/.next/lock" 2>/dev/null || true
sleep 2

cd "$FRONTEND"
npm run build
test -f .next/BUILD_ID
echo "BUILD_ID=$(cat .next/BUILD_ID)"

PM2_CONFIG="${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
if [[ -f "$PM2_CONFIG" ]]; then
  pm2 reload "$PM2_CONFIG" --update-env || pm2 start "$PM2_CONFIG"
else
  pm2 restart bahram-frontend
fi

sleep 4
echo "--- health ---"
curl -skI http://127.0.0.1:3000/ | head -4 || true
curl -skI http://127.0.0.1:3000/family | head -4 || true
echo "=== DONE $(date -Is) ==="
