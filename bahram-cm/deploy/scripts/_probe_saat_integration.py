#!/usr/bin/env python3
from pathlib import Path
import paramiko

ENV_FILE = Path(__file__).resolve().parents[1] / "deploy.env"
env = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=90)

script = r'''#!/bin/bash
set -a
source /var/www/bahram-cm/backend/.env
set +a
echo "PROXY_TOKEN set=$([ -n "$PROXY_SHARED_TOKEN" ] && echo yes || echo no)"
echo "SAT_HMAC set=$([ -n "$SAT_SYNC_HMAC_SECRET" ] && echo yes || echo no)"
# Try inbound ping to saat (needs integration token - check env)
grep -E '^SAT_|^PROXY_|^INTEGRATION' /var/www/bahram-cm/backend/.env | cut -d= -f1
curl -sk --max-time 10 -o /dev/null -w 'saat_inbound_ping:%{http_code}\n' \
  -H "Host: sat.center" \
  -H "X-Proxy-Origin: bahram" \
  https://185.130.50.24/api/v1/integrations/inbound/ping || true
curl -sk --max-time 10 https://sat.center/api/v1/integrations/inbound/ping -o /dev/null -w 'cf_inbound:%{http_code}\n' || true
'''

sftp = c.open_sftp()
with sftp.file("/tmp/saat_int.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat_int.sh", 0o755)
sftp.close()
_, o, e = c.exec_command("bash /tmp/saat_int.sh", timeout=30)
print(o.read().decode("utf-8", errors="replace"))
print(e.read().decode("utf-8", errors="replace"))
c.close()
