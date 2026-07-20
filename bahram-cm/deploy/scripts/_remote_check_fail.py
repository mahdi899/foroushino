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
    "cat /tmp/bahram-prod-php84.log 2>/dev/null",
    "cat /tmp/bahram-prod-php84.done 2>/dev/null",
    "apt-cache policy php8.4-fpm 2>&1 | head -8",
    "lsb_release -a 2>/dev/null",
]:
    print("\n===", cmd[:60], "===")
    _, o, e = c.exec_command(cmd, timeout=120)
    print(o.read().decode() + e.read().decode())
c.close()
