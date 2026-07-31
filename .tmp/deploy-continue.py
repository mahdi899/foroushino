import paramiko
from pathlib import Path

cfg = {}
for line in Path("bahram-cm/deploy/deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["DEPLOY_HOST"], username=cfg["DEPLOY_USER"], password=cfg["DEPLOY_PASSWORD"], timeout=60)

# Fix untracked conflict + pull + deploy
script = r"""
set -euo pipefail
cd /var/www/foroushino
rm -f bahram-cm/backend/app/Modules/TelegramBot/Console/TelegramHostPushAccountCommand.php
git checkout -- bahram-cm/frontend/lib/pwa/build-info.generated.ts bahram-cm/frontend/public/version.json 2>/dev/null || true
git pull --ff-only /tmp/foroushino-deploy.bundle main
echo pulled=$(git rev-parse --short HEAD)
bash /var/www/bahram-cm/deploy/scripts/deploy.sh
curl -sf http://127.0.0.1:8010/up && echo Laravel OK
curl -sf -o /dev/null -w "Next: %{http_code}\n" http://127.0.0.1:3000/
"""

transport = c.get_transport()
channel = transport.open_session()
channel.exec_command("bash -s")
channel.send(script)
channel.shutdown_write()

import sys
while True:
    if channel.recv_ready():
        sys.stdout.write(channel.recv(4096).decode("utf-8", errors="replace"))
        sys.stdout.flush()
    if channel.exit_status_ready():
        while channel.recv_ready():
            sys.stdout.write(channel.recv(4096).decode("utf-8", errors="replace"))
            sys.stdout.flush()
        break
    import time
    time.sleep(0.5)

code = channel.recv_exit_status()
c.close()
if code != 0:
    raise SystemExit(code)
