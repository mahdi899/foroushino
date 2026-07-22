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
ls -la /etc/php/8.4/fpm/conf.d/ | grep -i opcache
echo "---"
cat /etc/php/8.4/fpm/conf.d/*opcache* 2>/dev/null
echo "=== redis maxmemory / persistence ==="
redis-cli config get maxmemory
redis-cli config get maxmemory-policy
echo "=== mysql check ==="
mysql --version
"""
stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=60)
for line in stdout:
    print(line, end="")
    sys.stdout.flush()
exit_code = stdout.channel.recv_exit_status()
print("EXIT CODE:", exit_code)
client.close()
