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

if [[ -r /proc/meminfo ]]; then
  AVAIL_MB="$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)"
  echo "MemAvailable=${AVAIL_MB}MB"
  if [[ "${AVAIL_MB:-0}" -lt 1800 ]]; then
    echo "ERROR: need >= 1800MB MemAvailable for on-server next build — free RAM or build in CI and rsync .next"
    exit 1
  fi
fi

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"

# Stop crash-loop while .next is missing
pm2 stop bahram-frontend bahram-frontend-3000 bahram-frontend-3001 bahram-frontend-3002 2>/dev/null || true
pkill -f 'next build' 2>/dev/null || true
pkill -f 'npm run build' 2>/dev/null || true
rm -f "${FRONTEND}/.next/lock" 2>/dev/null || true
sleep 2

cd "$FRONTEND"
rm -rf .next
# NEXT_PUBLIC_* are baked at build time — ensure production origins before compile.
if [[ -f .env.local ]]; then
  grep -q '^NEXT_PUBLIC_APP_DOMAIN=' .env.local \
    && sed -i 's|^NEXT_PUBLIC_APP_DOMAIN=.*|NEXT_PUBLIC_APP_DOMAIN=rostami.app|' .env.local \
    || echo 'NEXT_PUBLIC_APP_DOMAIN=rostami.app' >> .env.local
  grep -q '^NEXT_PUBLIC_FAMILY_DOMAIN=' .env.local \
    && sed -i 's|^NEXT_PUBLIC_FAMILY_DOMAIN=.*|NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club|' .env.local \
    || echo 'NEXT_PUBLIC_FAMILY_DOMAIN=rostami.club' >> .env.local
  grep -q '^NEXT_PUBLIC_SITE_URL=' .env.local \
    && sed -i 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://rostami.app|' .env.local \
    || echo 'NEXT_PUBLIC_SITE_URL=https://rostami.app' >> .env.local
fi
export NEXT_DEPLOY_REV="$(git -C "${GIT_ROOT}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
echo "NEXT_DEPLOY_REV=${NEXT_DEPLOY_REV}"
npm run build
test -f .next/BUILD_ID
echo "BUILD_ID=$(cat .next/BUILD_ID)"

PM2_CONFIG="${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
if [[ -f "$PM2_CONFIG" ]]; then
  pm2 reload "$PM2_CONFIG" --update-env || pm2 start "$PM2_CONFIG"
else
  pm2 restart bahram-frontend-3000 bahram-frontend-3001 bahram-frontend-3002 2>/dev/null \
    || pm2 restart bahram-frontend
fi

sleep 4
rm -rf /var/cache/nginx/rostami_next/* 2>/dev/null || true
if [[ -f "${APP_ROOT}/backend/scripts/purge-cdn.php" ]]; then
  php "${APP_ROOT}/backend/scripts/purge-cdn.php" || echo "WARN: CDN purge skipped"
fi
echo "--- health ---"
curl -skI http://127.0.0.1:3000/ | head -4 || true
curl -skI http://127.0.0.1:3000/family | head -4 || true
echo "=== DONE $(date -Is) ==="
