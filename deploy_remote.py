#!/usr/bin/env python3
import os, sys, io, paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

HOST = "185.130.50.129"
USER = "root"
PASS = os.environ.get("DEPLOY_PASSWORD") or "N+y+GR)P:@j89p69"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASS, timeout=30)

cmd = r"""
set -e
cd /var/www/foroushino && git pull --ff-only origin main
bash /var/www/bahram-cm/deploy/scripts/deploy.sh
"""

stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=1200)
try:
    for line in stdout:
        print(line, end="")
        sys.stdout.flush()
except Exception as e:
    print("READ ERROR:", e)
exit_code = stdout.channel.recv_exit_status()
print("EXIT CODE:", exit_code)
client.close()
sys.exit(exit_code)
