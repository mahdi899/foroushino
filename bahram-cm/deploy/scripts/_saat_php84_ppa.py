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
LOG=/tmp/saat-php84-ppa.log
exec > >(tee "$LOG") 2>&1
export DEBIAN_FRONTEND=noninteractive
echo "=== SAAT PHP 8.4 PPA $(date -Is) ==="
lsb_release -a 2>/dev/null || true

if ! apt-cache show php8.4-fpm >/dev/null 2>&1; then
  echo "Adding ondrej/php PPA..."
  apt-get install -y -qq software-properties-common ca-certificates lsb-release apt-transport-https
  add-apt-repository -y ppa:ondrej/php
  apt-get update -qq
fi

apt-get install -y -qq \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-redis php8.4-mbstring \
  php8.4-xml php8.4-curl php8.4-gd php8.4-intl php8.4-zip php8.4-bcmath php8.4-ftp \
  php8.4-opcache php8.4-readline

update-alternatives --set php /usr/bin/php8.4 2>/dev/null || true
systemctl enable --now php8.4-fpm
php-fpm8.4 -t

for f in /etc/nginx/sites-available/sat-center.conf /etc/nginx/conf.d/*.conf; do
  [[ -f "$f" ]] && sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$f"
done
nginx -t
systemctl restart php8.4-fpm
systemctl reload nginx
php -v | head -1

cd /var/www/saat/backend
COMPOSER_ALLOW_SUPERUSER=1 composer install --optimize-autoloader --no-dev --no-interaction
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
supervisorctl restart saat-queue:* 2>/dev/null || true

cd /var/www/saat/frontend
npm ci --omit=dev || npm install --no-audit --no-fund
VITE_UPDATE_TYPE=optional npm run build
cp -f public/version.json dist/version.json 2>/dev/null || true

echo "=== HEALTH ==="
curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sk https://127.0.0.1/version.json -H 'Host: sat.center'
echo
curl -sk -o /dev/null -w 'admin_backup:%{http_code}\n' https://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=90)

sftp = c.open_sftp()
with sftp.file("/tmp/saat-php84-ppa.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-php84-ppa.sh", 0o755)
sftp.close()

c.exec_command("rm -f /tmp/saat-php84-ppa.log; nohup bash /tmp/saat-php84-ppa.sh &", timeout=15)
print("PPA + deploy started...")

for i in range(90):
    time.sleep(20)
    _, o, _ = c.exec_command(
        "grep -q '^DONE$' /tmp/saat-php84-ppa.log 2>/dev/null && echo FIN || echo RUN; tail -1 /tmp/saat-php84-ppa.log 2>/dev/null",
        timeout=45,
    )
    lines = o.read().decode().strip().split("\n")
    print(f"[{i*20:4d}s]", lines[0], "|", (lines[1] if len(lines) > 1 else "")[-90:])
    if lines and lines[0] == "FIN":
        _, o, _ = c.exec_command("tail -60 /tmp/saat-php84-ppa.log", timeout=120)
        print(o.read().decode("utf-8", errors="replace"))
        break
else:
    _, o, _ = c.exec_command("tail -50 /tmp/saat-php84-ppa.log", timeout=60)
    print("TIMEOUT:\n", o.read().decode("utf-8", errors="replace"))

c.close()
