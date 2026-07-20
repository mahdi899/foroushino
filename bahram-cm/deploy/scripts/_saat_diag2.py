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

cmds = [
    "systemctl is-active php8.3-fpm php8.4-fpm php8.2-fpm 2>/dev/null; systemctl list-units 'php*-fpm*' --no-pager",
    "grep fastcgi_pass /etc/nginx/sites-enabled/sat-center.conf 2>/dev/null || grep fastcgi_pass /etc/nginx/sites-available/sat-center.conf",
    "ls -la /run/php/ 2>/dev/null",
    "curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center' | head -c 300",
    "cd /var/www/foroushino && git rev-parse --short HEAD && git fetch origin main 2>&1 | tail -2 && git rev-parse --short origin/main 2>/dev/null",
    "nginx -t 2>&1",
    "tail -20 /var/log/nginx/error.log 2>/dev/null",
]
for cmd in cmds:
    print("===", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode("utf-8", errors="replace")[:2500])
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err[:300])
c.close()
