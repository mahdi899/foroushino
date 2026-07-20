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

cmds = [
    "grep -r '185.130.50.24\\|SAAT\\|sat.center' /root /var/www/bahram-cm/deploy 2>/dev/null | grep -v Binary | head -30",
    "test -f /var/www/bahram-cm/backend/.env && grep -E 'TELEGRAM_BOT_TOKEN=|SAT_' /var/www/bahram-cm/backend/.env | sed 's/=.*/=***/' | head -10",
    "ls -la /root/*.env /root/*secret* 2>/dev/null | head -10",
]
for cmd in cmds:
    print("===", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode("utf-8", errors="replace")[:3000])
c.close()
