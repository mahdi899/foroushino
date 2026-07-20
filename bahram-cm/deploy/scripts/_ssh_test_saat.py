#!/usr/bin/env python3
from pathlib import Path
import paramiko

ENV_FILE = Path(__file__).resolve().parents[1] / "deploy.env"
env = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

for host in ["185.130.50.24"]:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        c.connect(host, 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=20)
        _, o, _ = c.exec_command("hostname; ls /var/www/saat 2>&1 | head -3", timeout=15)
        print(host, "OK:", o.read().decode().strip())
        c.close()
    except Exception as e:
        print(host, "FAIL:", type(e).__name__, str(e)[:80])
