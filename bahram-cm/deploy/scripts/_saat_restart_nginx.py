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

echo "=== grep 8.3 in nginx ==="
grep -R "php8.3" /etc/nginx/ 2>/dev/null || echo "none"

echo "=== fix all ==="
grep -Rl "php8.3-fpm.sock" /etc/nginx/ 2>/dev/null | while read -r f; do
  sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$f"
  echo "fixed $f"
done

nginx -t
systemctl restart nginx
sleep 1

echo "=== test ==="
curl -sk --max-time 10 https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo

cd /var/www/saat/backend
composer install --optimize-autoloader --no-dev --no-interaction
php artisan config:cache
supervisorctl restart saat-queue:* 2>/dev/null || true

curl -sk --max-time 10 https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sk -o /dev/null -w 'backup:%{http_code}\n' https://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'

cd /var/www/saat/frontend && npm ci && VITE_UPDATE_TYPE=optional npm run build && cp -f public/version.json dist/version.json
curl -sk https://127.0.0.1/version.json -H 'Host: sat.center'
echo
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/saat-restart-nginx.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-restart-nginx.sh", 0o755)
sftp.close()
print("Restarting nginx...")
_, o, _ = c.exec_command("bash /tmp/saat-restart-nginx.sh 2>&1", timeout=600)
print(o.read().decode("utf-8", errors="replace"))
c.close()
