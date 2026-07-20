#!/usr/bin/env python3
import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(__file__).resolve().parents[1].joinpath("deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in [
    "test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && cat /var/www/bahram-cm/frontend/.next/BUILD_ID || echo NO_BUILD",
    "pm2 list",
    "free -h",
    "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>&1 || echo down",
]:
    print('===', cmd, '===')
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', errors='replace'))
c.close()
