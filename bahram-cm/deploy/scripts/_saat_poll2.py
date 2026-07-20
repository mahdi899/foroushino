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
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=90)
for cmd in [
    "ps aux | grep -E 'saat-php84|apt-get|composer|npm' | grep -v grep | head -10",
    "tail -40 /tmp/saat-php84-fix.log 2>/dev/null || echo NO_PHP84_LOG",
    "systemctl is-active php8.3-fpm php8.4-fpm",
    "php8.4 -v 2>/dev/null | head -1 || echo NO_PHP84",
    "curl -sk https://sat.center/api/v1/health | head -c 250",
    "curl -sk https://sat.center/version.json",
    "curl -sk -o /dev/null -w 'admin_backup:%{http_code}\\n' https://sat.center/api/v1/admin/backup -H 'Accept: application/json'",
]:
    print("===", cmd[:90])
    _, o, _ = c.exec_command(cmd, timeout=45)
    print(o.read().decode("utf-8", errors="replace")[:2500])
c.close()
