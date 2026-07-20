#!/usr/bin/env python3
import io, sys, time
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

cmd = """export DEBIAN_FRONTEND=noninteractive
apt-get install -y -qq php8.4-fpm php8.4-cli php8.4-mysql php8.4-redis php8.4-mbstring php8.4-xml php8.4-curl php8.4-gd php8.4-intl php8.4-zip php8.4-bcmath php8.4-ftp php8.4-opcache php8.4-readline 2>&1 | tail -30
echo EXIT:$?
"""
print("Installing PHP 8.4...")
_, o, e = c.exec_command(cmd, timeout=600)
print(o.read().decode() + e.read().decode())
c.close()
