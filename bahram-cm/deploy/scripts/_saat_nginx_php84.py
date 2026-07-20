#!/usr/bin/env python3
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
env = {}
for line in (ROOT / "saat" / "deploy" / "deploy.env").read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

script = r"""#!/bin/bash
set -euo pipefail
LOG=/tmp/saat-nginx-php84.log
exec > >(tee "$LOG") 2>&1
export COMPOSER_ALLOW_SUPERUSER=1
echo "=== NGINX PHP84 FIX $(date -Is) ==="

echo "--- current upstream ---"
grep -R "saat_php\|fastcgi_pass\|php8" /etc/nginx/sites-available/sat-center.conf /etc/nginx/conf.d/ 2>/dev/null | head -20

# Fix upstream block if it still points to 8.3
CONF=/etc/nginx/sites-available/sat-center.conf
if grep -q 'upstream saat_php' "$CONF"; then
  sed -i 's|unix:/run/php/php8.3-fpm.sock|unix:/run/php/php8.4-fpm.sock|g' "$CONF"
  sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$CONF"
fi
sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' /etc/nginx/conf.d/*.conf 2>/dev/null || true

systemctl restart php8.4-fpm
systemctl stop php8.3-fpm 2>/dev/null || true
nginx -t
systemctl reload nginx

echo "--- php-fpm socket ---"
ls -la /run/php/

cd /var/www/saat/backend
composer install --optimize-autoloader --no-dev --no-interaction
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
supervisorctl restart saat-queue:* 2>/dev/null || true

echo "--- health ---"
curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sk -o /dev/null -w 'backup:%{http_code}\n' https://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'

# frontend if not running
if ! pgrep -f 'npm run build' >/dev/null; then
  cd /var/www/saat/frontend
  npm ci --omit=dev 2>/dev/null || npm install --no-audit --no-fund
  VITE_UPDATE_TYPE=optional npm run build
  cp -f public/version.json dist/version.json 2>/dev/null || true
  curl -sk https://127.0.0.1/version.json -H 'Host: sat.center'
  echo
fi
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120, banner_timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/saat-nginx-php84.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-nginx-php84.sh", 0o755)
sftp.close()
c.exec_command("nohup bash /tmp/saat-nginx-php84.sh >/tmp/saat-nginx-php84.nohup 2>&1 &", timeout=20)
print("Nginx+PHP84 fix started")
time.sleep(90)
_, o, _ = c.exec_command("tail -40 /tmp/saat-nginx-php84.log 2>/dev/null; grep -q '^DONE$' /tmp/saat-nginx-php84.log && echo FIN || echo RUN", timeout=60)
print(o.read().decode("utf-8", errors="replace"))
c.close()
