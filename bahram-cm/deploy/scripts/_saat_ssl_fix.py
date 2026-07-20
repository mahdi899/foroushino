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
echo "=== SSL paths ==="
ls -la /etc/letsencrypt/live/
grep ssl_certificate /etc/nginx/sites-enabled/sat-center.conf | head -6

# Fix cert dir if broken by earlier overwrite
if [[ ! -f /etc/letsencrypt/live/sat.center/fullchain.pem ]]; then
  if [[ -f /etc/letsencrypt/live/sat.center-0001/fullchain.pem ]]; then
    sed -i 's|/etc/letsencrypt/live/sat.center/|/etc/letsencrypt/live/sat.center-0001/|g' /etc/nginx/sites-enabled/sat-center.conf
    sed -i 's|/etc/letsencrypt/live/sat.center/|/etc/letsencrypt/live/sat.center-0001/|g' /etc/nginx/sites-available/sat-center.conf
    echo "Fixed cert path to sat.center-0001"
  fi
fi

sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' /etc/nginx/sites-enabled/sat-center.conf
sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' /etc/nginx/sites-available/sat-center.conf

nginx -t
systemctl reload nginx

curl -sk --max-time 10 https://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/saat-ssl-fix.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-ssl-fix.sh", 0o755)
sftp.close()
_, o, _ = c.exec_command("bash /tmp/saat-ssl-fix.sh", timeout=60)
print(o.read().decode("utf-8", errors="replace"))
c.close()
