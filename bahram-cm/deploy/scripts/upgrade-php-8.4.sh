#!/usr/bin/env bash
# Upgrade an existing Bahram CM server from PHP 8.3 → 8.4 (in-place).
# Usage: sudo bash upgrade-php-8.4.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "==> Install PHP 8.4 + extensions"
apt-get update -qq
apt-get install -y -qq \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-redis php8.4-mbstring \
  php8.4-xml php8.4-curl php8.4-gd php8.4-intl php8.4-zip php8.4-bcmath php8.4-ftp \
  php8.4-opcache php8.4-readline

echo "==> Enable PHP 8.4 FPM"
systemctl enable --now php8.4-fpm

NGINX_UPSTREAM="/etc/nginx/conf.d/rostami-upstreams.conf"
if [[ -f "$NGINX_UPSTREAM" ]]; then
  sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$NGINX_UPSTREAM"
fi

SAT_NGINX="/etc/nginx/sites-available/sat-center.conf"
if [[ -f "$SAT_NGINX" ]]; then
  sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$SAT_NGINX"
fi

echo "==> Test nginx + PHP-FPM"
nginx -t
php-fpm8.4 -t
systemctl restart php8.4-fpm
systemctl reload nginx

echo "==> Deploy app (composer + caches)"
APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
if [[ -d "$APP_ROOT/backend" ]]; then
  cd "$APP_ROOT/backend"
  composer install --no-dev --optimize-autoloader --no-interaction
  php artisan migrate --force
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
fi

supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null || true

echo ""
echo "============================================"
echo " PHP 8.4 upgrade complete."
echo " Verify: php -v && curl -s http://127.0.0.1:8010/up"
echo ""
echo " Optional: disable old PHP 8.3 after 24h smoke test:"
echo "   systemctl stop php8.3-fpm && systemctl disable php8.3-fpm"
echo "============================================"
