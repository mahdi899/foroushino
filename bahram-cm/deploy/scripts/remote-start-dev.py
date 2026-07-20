#!/usr/bin/env python3
"""Run start-dev-server.sh on origin (requires SSH)."""
import os
import paramiko
import sys
import io
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

APP = Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm")
HOST = "185.130.50.129"
USER = "root"
PASS = os.environ.get("DEPLOY_PASSWORD", "N+y+GR)P:@j89p69")

FILES = [
    "deploy/scripts/start-dev-server.sh",
    "deploy/scripts/start-prod-server.sh",
    "deploy/pm2/ecosystem.dev.config.cjs",
    "backend/app/Support/FamilyMediaUrl.php",
    "frontend/lib/mediaUrl.ts",
]


def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=60, banner_timeout=120, auth_timeout=120)
    return c


def run(cmd, timeout=600):
    print(f"\n>>> {cmd[:100]}")
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out:
        print(out)
    if err:
        print("ERR:", err[:800])
    return out


if __name__ == "__main__":
    c = connect()
    print("SSH OK")
    sftp = c.open_sftp()
    for rel in FILES:
        local = APP / rel
        remote = f"/var/www/bahram-cm/{rel.replace(chr(92), '/')}"
        print(f"upload {rel}")
        sftp.put(str(local), remote)
    sftp.close()

    run("chmod +x /var/www/bahram-cm/deploy/scripts/start-dev-server.sh /var/www/bahram-cm/deploy/scripts/start-prod-server.sh")
    run("bash /var/www/bahram-cm/deploy/scripts/start-dev-server.sh 2>&1 | tee /tmp/start-dev-server.log", timeout=900)
    c.close()
