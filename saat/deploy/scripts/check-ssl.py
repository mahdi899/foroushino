#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=60)

cmds = [
    "ls -la /etc/letsencrypt/live/ 2>/dev/null || echo no-certs",
    "grep ssl_certificate /etc/nginx/sites-enabled/sat-center.conf | head -5",
    "nginx -t 2>&1 | tail -5",
]

for cmd in cmds:
    print("===", cmd, "===")
    _, o, e = c.exec_command(cmd)
    print(o.read().decode())
    print(e.read().decode())

c.close()
