#!/usr/bin/env python3
import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy\deploy.env").read_text(encoding="utf-8").splitlines():
    line=line.strip()
    if line and not line.startswith("#") and "=" in line:
        k,v=line.split("=",1); env[k.strip()]=v.strip()
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], int(env.get("DEPLOY_PORT","22")), env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in [
    "cat /tmp/bahram-prod-deploy2.log 2>/dev/null | tail -80",
    "cat /tmp/bahram-prod-deploy2.done 2>/dev/null",
    "php -v | head -1; systemctl is-active php8.4-fpm nginx",
    "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:8010/up; echo",
    "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/; echo",
    "test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && echo HAS_BUILD || echo NO_BUILD",
]:
    print("\n===", cmd, "===")
    _, o, e = c.exec_command(cmd, timeout=90)
    print(o.read().decode() + e.read().decode())
c.close()
