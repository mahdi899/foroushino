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
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in [
    "grep -n 'upstream\\|fastcgi\\|php8' /etc/nginx/sites-available/sat-center.conf | head -25",
    "ls -la /run/php/",
    "systemctl status php8.4-fpm --no-pager | head -12",
    "tail -15 /var/log/nginx/error.log",
    "tail -20 /tmp/saat-nginx-php84.log",
]:
    print("===", cmd[:85])
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode("utf-8", errors="replace")[:2500])
c.close()
