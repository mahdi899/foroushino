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
echo "=== PHP version in use ==="
php -v | head -n 2
echo "=== OPcache status ==="
php -i | grep -i "opcache.enable\b" || echo "opcache module info:"
php -m | grep -i opcache || echo "OPcache module NOT loaded"
echo "=== opcache key settings ==="
php -i 2>/dev/null | grep -iE "opcache\.(enable|memory_consumption|max_accelerated_files|validate_timestamps|revalidate_freq|jit)" || true
echo "=== php-fpm pool (8.4) ==="
grep -E "^pm|^pm\." /etc/php/8.4/fpm/pool.d/*.conf 2>/dev/null | grep -v "^#"
echo "=== redis check ==="
redis-cli ping 2>/dev/null || echo "redis-cli not available/ping failed"
echo "=== queue workers running ==="
ps aux | grep -i "queue:work\|horizon" | grep -v grep
echo "=== cpu / mem ==="
nproc
free -h
"""
stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=60)
for line in stdout:
    print(line, end="")
    sys.stdout.flush()
exit_code = stdout.channel.recv_exit_status()
print("EXIT CODE:", exit_code)
client.close()
