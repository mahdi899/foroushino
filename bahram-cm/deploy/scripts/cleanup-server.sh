#!/usr/bin/env bash
# Remove build/cache cruft that accumulates on the origin server over time.
# Safe to re-run — does not touch .env, media, or database.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"

echo "==> APT cache + orphaned packages"
apt-get autoremove --purge -y -qq
apt-get autoclean -y -qq
apt-get clean -qq

echo "==> Old kernels (keep current + 1 previous)"
if command -v apt-get >/dev/null 2>&1; then
  apt-get purge -y -qq "$(dpkg -l 'linux-image-*' | awk '/^ii/{print $2}' | grep -v "$(uname -r)" | sort -V | head -n -1 | tr '\n' ' ')" 2>/dev/null || true
fi

echo "==> Journal + rotated logs"
journalctl --vacuum-time=7d >/dev/null 2>&1 || true
find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
find /var/log -type f -regex '.*\.[0-9]$' -delete 2>/dev/null || true
find /var/log/pm2 -type f -mtime +14 -delete 2>/dev/null || true

echo "==> Laravel: expired cache/session rows + storage tmp"
if [[ -d "${APP_ROOT}/backend" ]]; then
  cd "${APP_ROOT}/backend"
  php artisan cache:prune-stale-tags 2>/dev/null || true
  find storage/framework/cache/data -type f -mtime +7 -delete 2>/dev/null || true
  find storage/framework/sessions -type f -mtime +30 -delete 2>/dev/null || true
  find storage/logs -type f -name "*.log" -mtime +14 -delete 2>/dev/null || true
fi

echo "==> npm/composer caches"
npm cache clean --force >/dev/null 2>&1 || true
composer clear-cache >/dev/null 2>&1 || true

echo "==> /tmp"
find /tmp -type f -mtime +3 -delete 2>/dev/null || true

echo "==> Disk usage after cleanup:"
df -h /
