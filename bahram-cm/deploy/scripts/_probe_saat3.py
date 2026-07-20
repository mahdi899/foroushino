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
    "ls -la ~/.ssh/ 2>/dev/null; cat ~/.ssh/config 2>/dev/null | head -20",
    "test -f /root/bahram-sync-secrets.env && echo HAS_SYNC_SECRETS || echo NO_SYNC",
    "test -d /var/www/mini-call-center && echo HAS_MINI || echo NO_MINI",
    "curl -sk -H 'Host: sat.center' https://185.130.50.24/api/v1/health",
    "curl -sk -H 'Host: sat.center' https://185.130.50.24/api/v1/auth/demo-accounts",
    "curl -sk -H 'Host: sat.center' -o /dev/null -w 'up:%{http_code}\\n' https://185.130.50.24/up",
    "curl -sk -H 'Host: sat.center' -o /dev/null -w 'sanctum:%{http_code}\\n' https://185.130.50.24/sanctum/csrf-cookie",
    "curl -sk -H 'Host: sat.center' https://185.130.50.24/version.json",
    "ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@185.130.50.24 'hostname' 2>&1 | head -3",
]
for cmd in cmds:
    print("===", cmd[:95])
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err[:500])
c.close()
