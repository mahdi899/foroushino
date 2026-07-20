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
LOG=/tmp/saat-php84-fix.log
exec > >(tee "$LOG") 2>&1
export DEBIAN_FRONTEND=noninteractive
echo "=== PHP 8.4 UPGRADE $(date -Is) ==="

apt-get update -qq
apt-get install -y -qq \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-redis php8.4-mbstring \
  php8.4-xml php8.4-curl php8.4-gd php8.4-intl php8.4-zip php8.4-bcmath php8.4-ftp \
  php8.4-opcache php8.4-readline

systemctl enable --now php8.4-fpm
php-fpm8.4 -t

# Point nginx saat upstream at 8.4 socket
for f in /etc/nginx/sites-available/sat-center.conf /etc/nginx/conf.d/*.conf; do
  [[ -f "$f" ]] && sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$f"
done
if grep -q 'upstream saat_php' /etc/nginx/sites-available/sat-center.conf 2>/dev/null; then
  sed -i 's|unix:/run/php/php8.3-fpm.sock|unix:/run/php/php8.4-fpm.sock|g' /etc/nginx/sites-available/sat-center.conf
fi
nginx -t
systemctl restart php8.4-fpm
systemctl reload nginx
php -v | head -1

echo "=== DEPLOY ==="
cd /var/www/saat
bash deploy/scripts/deploy.sh all

supervisorctl restart saat-queue:* 2>/dev/null || true

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
with sftp.file("/tmp/saat-php84-fix.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-php84-fix.sh", 0o755)
sftp.close()

c.exec_command("rm -f /tmp/saat-php84-fix.log; nohup bash /tmp/saat-php84-fix.sh &", timeout=15)
print("PHP 8.4 upgrade + deploy started...")

for i in range(60):
    time.sleep(20)
    _, o, _ = c.exec_command(
        "grep -q '^DONE$' /tmp/saat-php84-fix.log 2>/dev/null && echo FIN || (tail -1 /tmp/saat-php84-fix.log 2>/dev/null; echo RUN)",
        timeout=45,
    )
    lines = o.read().decode().strip().split("\n")
    print(f"[{i*20:4d}s]", lines[-1][:120] if lines else "?")
    if lines and lines[-1] == "FIN":
        _, o, _ = c.exec_command("tail -80 /tmp/saat-php84-fix.log", timeout=120)
        print(o.read().decode("utf-8", errors="replace"))
        break
else:
    _, o, _ = c.exec_command("tail -40 /tmp/saat-php84-fix.log", timeout=60)
    print("TIMEOUT:\n", o.read().decode("utf-8", errors="replace"))

c.close()
