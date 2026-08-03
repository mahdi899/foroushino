#!/usr/bin/env bash
# One-shot production deploy for purchase rate-limit fix.
# Skips npm run typecheck (build only).
set -euo pipefail

export APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
export GIT_ROOT="${GIT_ROOT:-/var/www/foroushino}"

echo "==> Git pull"
cd "$GIT_ROOT"
git fetch origin main
if ! git pull --ff-only origin main; then
  echo "WARN: ff-only failed — stash and retry"
  git stash push -u -m "pre-deploy-$(date +%Y%m%d%H%M)" || true
  git pull --ff-only origin main
fi
echo "HEAD=$(git rev-parse --short HEAD) $(git log -1 --oneline)"

if ! git merge-base --is-ancestor 102243e1 HEAD; then
  echo "ERROR: purchase rate-limit commit 102243e1 not in HEAD"
  exit 1
fi
echo "OK: purchase rate-limit commit is ancestor of HEAD"

echo "==> TRUSTED_PROXIES"
ENV_FILE="$APP_ROOT/backend/.env"
if grep -q '^TRUSTED_PROXIES=' "$ENV_FILE"; then
  sed -i 's|^TRUSTED_PROXIES=.*|TRUSTED_PROXIES=127.0.0.1,::1|' "$ENV_FILE"
else
  printf '\nTRUSTED_PROXIES=127.0.0.1,::1\n' >> "$ENV_FILE"
fi
grep '^TRUSTED_PROXIES=' "$ENV_FILE"

echo "==> Backend composer + migrate + caches"
cd "$APP_ROOT/backend"
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:clear
php artisan route:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan storage:link 2>/dev/null || true

echo "==> Verify purchase middleware in route cache"
php -r '
$cached = __DIR__ . "/bootstrap/cache/routes-v7.php";
if (!is_file($cached)) { fwrite(STDERR, "ERROR: no route cache\n"); exit(1); }
$s = file_get_contents($cached);
$ok = true;
foreach (["purchase-order", "purchase-payment", "guest-checkout-otp", "optional.bearer"] as $needle) {
  if (str_contains($s, $needle)) {
    echo "OK $needle\n";
  } else {
    echo "MISSING $needle\n";
    $ok = false;
  }
}
exit($ok ? 0 : 1);
'

echo "==> Reload php-fpm"
systemctl reload php8.4-fpm 2>/dev/null || systemctl restart php8.4-fpm 2>/dev/null || true

echo "==> Frontend build (NO typecheck)"
cd "$APP_ROOT/frontend"
AVAIL_MB="$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)"
echo "MemAvailable=${AVAIL_MB}MB"
if [[ "${AVAIL_MB:-0}" -lt 1800 ]]; then
  echo "ERROR: need >= 1800MB MemAvailable for next build"
  free -h
  exit 1
fi

pm2 stop bahram-frontend bahram-frontend-3000 bahram-frontend-3001 bahram-frontend-3002 2>/dev/null || true
pkill -f 'next build' 2>/dev/null || true
pkill -f 'npm run build' 2>/dev/null || true
rm -f .next/lock 2>/dev/null || true
sleep 2

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

unset NODE_ENV
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
unset NEXT_DEPLOY_REV
export NEXT_DEPLOY_REV=
if ! npm ci; then npm install --no-audit --no-fund; fi
export NODE_ENV=production
rm -rf .next
# Skip typecheck intentionally
npm run build
test -f .next/BUILD_ID
echo "BUILD_ID=$(cat .next/BUILD_ID)"

if grep -q 'forwardedClientHeaders' "$APP_ROOT/frontend/lib/checkout/actions.ts"; then
  echo "OK checkout actions contain forwardedClientHeaders"
else
  echo "ERROR: checkout actions missing forwardedClientHeaders"
  exit 1
fi

echo "==> Reload PM2"
PM2_CONFIG="$APP_ROOT/deploy/pm2/ecosystem.config.cjs"
pm2 reload "$PM2_CONFIG" --update-env || pm2 start "$PM2_CONFIG"
sleep 4
rm -rf /var/cache/nginx/rostami_next/* 2>/dev/null || true

echo "==> Restart queue workers"
supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null \
  || supervisorctl restart bahram-queue:* 2>/dev/null || true

echo "==> Health"
curl -skI http://127.0.0.1:3000/ | head -5 || true
curl -s http://127.0.0.1:8010/up || true
echo
echo "==> Deploy done $(date -Is)"
