#!/usr/bin/env python3
from pathlib import Path
import paramiko

ROOT = Path(__file__).resolve().parents[3]
env = {}
for line in (ROOT / "saat" / "deploy" / "deploy.env").read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

script = r"""#!/bin/bash
set -euo pipefail
export COMPOSER_ALLOW_SUPERUSER=1

for f in /etc/nginx/sites-enabled/* /etc/nginx/sites-available/*; do
  [[ -f "$f" ]] && sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$f"
done

grep -R "php8.*fpm.sock" /etc/nginx/sites-enabled/ 2>/dev/null | head -10
ls -la /etc/letsencrypt/live/ 2>/dev/null | head -10

systemctl restart php8.4-fpm
systemctl stop php8.3-fpm 2>/dev/null || true
nginx -t
systemctl reload nginx

cd /var/www/saat/backend
composer install --optimize-autoloader --no-dev --no-interaction
php artisan config:cache && php artisan route:cache
supervisorctl restart saat-queue:* 2>/dev/null || true

cd /var/www/saat/frontend
npm ci || npm install --no-audit --no-fund
VITE_UPDATE_TYPE=optional npm run build
cp -f public/version.json dist/version.json

curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sk https://127.0.0.1/version.json -H 'Host: sat.center'
echo
curl -sk -o /dev/null -w 'backup:%{http_code}\n' https://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/saat-socket-fix.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-socket-fix.sh", 0o755)
sftp.close()
print("Running socket-only fix...")
_, o, e = c.exec_command("bash /tmp/saat-socket-fix.sh 2>&1 | tee /tmp/saat-socket-fix.log", timeout=600)
print(o.read().decode("utf-8", errors="replace"))
c.close()
