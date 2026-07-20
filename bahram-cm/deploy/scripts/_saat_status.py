#!/usr/bin/env python3
from pathlib import Path
import paramiko

ROOT = Path(__file__).resolve().parents[3]
env = {}
for line in (ROOT / "saat" / "deploy" / "deploy.env").read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120, banner_timeout=120)

cmds = [
    "ps aux | grep saat-php84 | grep -v grep | head -5",
    "ps aux | grep -E 'apt-get|composer|npm run' | grep -v grep | head -8",
    "tail -30 /tmp/saat-php84-ppa.log 2>/dev/null || echo NO_LOG",
    "systemctl is-active php8.4-fpm php8.3-fpm",
    "php8.4 -v 2>/dev/null | head -1 || php -v | head -1",
    "curl -sk --max-time 10 https://sat.center/api/v1/health",
    "curl -sk --max-time 10 https://sat.center/version.json",
    "curl -sk --max-time 10 -o /dev/null -w 'backup:%{http_code}\\n' https://sat.center/api/v1/admin/backup -H 'Accept: application/json'",
]
for cmd in cmds:
    print("===", cmd[:90])
    _, o, _ = c.exec_command(cmd, timeout=45)
    print(o.read().decode("utf-8", errors="replace")[:2000])
c.close()
