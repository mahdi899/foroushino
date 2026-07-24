#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=60)

cmds = [
    "ls -la /etc/nginx/sites-enabled/",
    "nginx -T 2>/dev/null | grep -A8 'location.*storage/avatars' | head -20",
    "nginx -T 2>/dev/null | grep -B2 -A6 'jpg|jpeg' | head -25",
]

for cmd in cmds:
    print("===", cmd, "===")
    _, o, e = c.exec_command(cmd, timeout=120)
    print(o.read().decode()[:3000])

c.close()
