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
F=/etc/php/8.4/fpm/pool.d/www.conf
cp "$F" "$F.bak.$(date +%s)"
sed -i 's/^pm.max_children = .*/pm.max_children = 12/' "$F"
sed -i 's/^pm.start_servers = .*/pm.start_servers = 3/' "$F"
sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 2/' "$F"
sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 6/' "$F"
grep -nE "^pm\." "$F"
php-fpm8.4 -t
systemctl reload php8.4-fpm
echo DONE
"""
stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=60)
for line in stdout:
    print(line, end="")
    sys.stdout.flush()
exit_code = stdout.channel.recv_exit_status()
print("EXIT CODE:", exit_code)
client.close()
