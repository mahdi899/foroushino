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
LOG=/tmp/saat-finish-deploy.log
exec > >(tee "$LOG") 2>&1
export DEBIAN_FRONTEND=noninteractive
export COMPOSER_ALLOW_SUPERUSER=1
echo "=== FINISH DEPLOY $(date -Is) ==="

# nginx → PHP 8.4
for f in /etc/nginx/sites-available/sat-center.conf /etc/nginx/conf.d/*.conf; do
  [[ -f "$f" ]] && sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$f"
done
update-alternatives --set php /usr/bin/php8.4 2>/dev/null || true
systemctl restart php8.4-fpm
nginx -t && systemctl reload nginx
php -v | head -1

cd /var/www/foroushino
git fetch origin main
git reset --hard origin/main
echo GIT=$(git rev-parse --short HEAD)

cd /var/www/saat
bash deploy/scripts/deploy.sh all

supervisorctl restart saat-queue:* 2>/dev/null || true

echo "=== VERIFY ==="
curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sk https://127.0.0.1/version.json -H 'Host: sat.center'
echo
curl -sk -o /dev/null -w 'admin_backup:%{http_code}\n' https://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120, banner_timeout=120)

sftp = c.open_sftp()
with sftp.file("/tmp/saat-finish-deploy.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-finish-deploy.sh", 0o755)
sftp.close()

# Run fully detached on server — no SSH polling loop
c.exec_command("nohup bash /tmp/saat-finish-deploy.sh >/tmp/saat-finish-deploy.nohup 2>&1 &", timeout=20)
print("Finish deploy started (detached on server). Log: /tmp/saat-finish-deploy.log")
c.close()
