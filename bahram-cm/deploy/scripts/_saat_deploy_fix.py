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
LOG=/tmp/saat-deploy-fix.log
exec > >(tee "$LOG") 2>&1
echo "=== SAAT DEPLOY FIX $(date -Is) ==="

cd /var/www/foroushino
git fetch origin main
git reset --hard origin/main
echo GIT_HEAD=$(git rev-parse --short HEAD)

cd /var/www/saat
bash deploy/scripts/deploy.sh all

# Ensure PHP-FPM pool matches nginx (8.3 on this host)
if systemctl is-active php8.3-fpm >/dev/null 2>&1; then
  echo "PHP 8.3 FPM active"
elif systemctl is-active php8.4-fpm >/dev/null 2>&1; then
  echo "PHP 8.4 FPM active"
else
  systemctl start php8.3-fpm 2>/dev/null || systemctl start php8.4-fpm
fi

# Remove stray bahram-queue supervisor if present on saat host
supervisorctl stop bahram-queue:* 2>/dev/null || true
supervisorctl remove bahram-queue:* 2>/dev/null || true

supervisorctl restart saat-queue:* 2>/dev/null || true
nginx -t && systemctl reload nginx
systemctl reload php8.3-fpm 2>/dev/null || systemctl reload php8.4-fpm 2>/dev/null || true

echo "=== HEALTH ==="
curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sk https://127.0.0.1/version.json -H 'Host: sat.center'
echo
curl -sk -o /dev/null -w 'admin_backup:%{http_code}\n' https://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'
supervisorctl status saat-queue:* 2>/dev/null || true
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=90)

sftp = c.open_sftp()
with sftp.file("/tmp/saat-deploy-fix.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-deploy-fix.sh", 0o755)
sftp.close()

c.exec_command("rm -f /tmp/saat-deploy-fix.log; nohup bash /tmp/saat-deploy-fix.sh &", timeout=15)
print("Deploy started on Saat...")

for i in range(80):
    time.sleep(15)
    _, o, _ = c.exec_command(
        "test -f /tmp/saat-deploy-fix.log && tail -2 /tmp/saat-deploy-fix.log; "
        "grep -q '^DONE$' /tmp/saat-deploy-fix.log 2>/dev/null && echo FIN || echo RUN",
        timeout=45,
    )
    lines = o.read().decode().strip().split("\n")
    status = lines[-1] if lines else "?"
    tail = lines[-2] if len(lines) > 1 else ""
    print(f"[{i*15:4d}s] {status} | {tail[-100:]}")
    if status == "FIN":
        _, o, _ = c.exec_command("cat /tmp/saat-deploy-fix.log", timeout=120)
        print(o.read().decode("utf-8", errors="replace"))
        break
else:
    _, o, _ = c.exec_command("tail -50 /tmp/saat-deploy-fix.log", timeout=60)
    print("TIMEOUT - tail:")
    print(o.read().decode("utf-8", errors="replace"))

c.close()
