#!/usr/bin/env python3
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
env = {}
for line in (ROOT / "saat" / "deploy" / "deploy.env").read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

nginx_conf = (ROOT / "saat" / "deploy" / "nginx" / "sat-center.conf").read_text(encoding="utf-8")

script = r"""#!/bin/bash
set -euo pipefail
export COMPOSER_ALLOW_SUPERUSER=1
echo "=== NGINX RESTART FIX ==="

# Ensure enabled site matches repo (php8.4 upstream)
cp /tmp/sat-center.conf /etc/nginx/sites-available/sat-center.conf
ln -sf /etc/nginx/sites-available/sat-center.conf /etc/nginx/sites-enabled/sat-center.conf

grep -n 'upstream saat_php' -A2 /etc/nginx/sites-enabled/sat-center.conf

systemctl restart php8.4-fpm
systemctl disable php8.3-fpm 2>/dev/null || true
systemctl stop php8.3-fpm 2>/dev/null || true
nginx -t
systemctl restart nginx

cd /var/www/saat/backend
php8.4 /usr/local/bin/composer install --optimize-autoloader --no-dev --no-interaction 2>/dev/null \
  || php8.4 $(which composer) install --optimize-autoloader --no-dev --no-interaction
php8.4 artisan migrate --force
php8.4 artisan config:cache
php8.4 artisan route:cache
php8.4 artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
supervisorctl restart saat-queue:* 2>/dev/null || true

cd /var/www/saat/frontend
npm ci || npm install --no-audit --no-fund
VITE_UPDATE_TYPE=optional npm run build
cp -f public/version.json dist/version.json

echo "=== VERIFY ==="
curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sk https://127.0.0.1/version.json -H 'Host: sat.center'
echo
curl -sk -o /dev/null -w 'backup:%{http_code}\n' https://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120, banner_timeout=120)

sftp = c.open_sftp()
with sftp.file("/tmp/sat-center.conf", "w") as f:
    f.write(nginx_conf)
with sftp.file("/tmp/saat-final-fix.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-final-fix.sh", 0o755)
sftp.close()

print("Running final fix (may take ~3 min)...")
_, o, e = c.exec_command("bash /tmp/saat-final-fix.sh 2>&1 | tee /tmp/saat-final-fix.log", timeout=600)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace")
if err.strip():
    print("ERR:", err[:500])
c.close()
