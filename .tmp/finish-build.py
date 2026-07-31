import paramiko
import time
from pathlib import Path

cfg = {}
for line in Path("bahram-cm/deploy/deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["DEPLOY_HOST"], username=cfg["DEPLOY_USER"], password=cfg["DEPLOY_PASSWORD"], timeout=60)

script = r"""
set -euo pipefail
LOG=/tmp/finish-build.log
exec > >(tee -a "$LOG") 2>&1
echo "=== FINISH BUILD $(date -Is) ==="
cd /var/www/bahram-cm/frontend
export NODE_OPTIONS=--max-old-space-size=3072
unset NODE_ENV
npm run build
export NODE_ENV=production
pm2 reload /var/www/bahram-cm/deploy/pm2/ecosystem.config.cjs --update-env || pm2 start /var/www/bahram-cm/deploy/pm2/ecosystem.config.cjs
sudo supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null || sudo supervisorctl restart bahram-queue:*
echo BUILD_ID=$(cat .next/BUILD_ID)
curl -sf http://127.0.0.1:8010/up && echo Laravel OK
curl -sf -o /dev/null -w "Next: %{http_code}\n" http://127.0.0.1:3000/
echo "=== DONE $(date -Is) ==="
"""

transport = c.get_transport()
channel = transport.open_session()
channel.exec_command("bash -s")
channel.send(script)
channel.shutdown_write()

while not channel.exit_status_ready():
    time.sleep(5)

code = channel.recv_exit_status()
_, stdout, stderr = c.exec_command("cat /tmp/finish-build.log 2>/dev/null | tail -80")
log = stdout.read().decode("utf-8", errors="replace")
Path(".tmp/finish-build.log").write_text(log, encoding="utf-8")
c.close()
print(f"exit={code}, log tail written to .tmp/finish-build.log")
