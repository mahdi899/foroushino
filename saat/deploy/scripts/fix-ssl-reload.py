#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=60)

cmds = [
    "ln -sfn /etc/letsencrypt/live/sat.center-0001 /etc/letsencrypt/live/sat.center",
    "nginx -t",
    "systemctl reload nginx",
    "curl -skI -H 'Host: sat.center' https://127.0.0.1/storage/avatars/users/1.jpg | grep -iE 'cache|cdn|expires|HTTP'",
    "nginx -T 2>/dev/null | grep -A3 'location.*storage/avatars' | head -8",
]

for cmd in cmds:
    print("===", cmd, "===")
    _, o, e = c.exec_command(cmd)
    print(o.read().decode())
    err = e.read().decode()
    if err.strip():
        print("ERR", err)

c.close()
