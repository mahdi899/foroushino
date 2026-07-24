#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=60)

cmds = [
    "grep -A6 'location.*storage/avatars' /etc/nginx/sites-available/sat-center.conf",
    "curl -skI -H 'Host: sat.center' https://127.0.0.1/storage/avatars/users/1.jpg | grep -iE 'cache|cdn|expires|HTTP'",
    "curl -skI -H 'Host: sat.center' https://127.0.0.1/api/v1/health | grep -iE 'cache|cdn|HTTP'",
]

for cmd in cmds:
    print("===", cmd, "===")
    _, o, e = c.exec_command(cmd)
    print(o.read().decode())
    err = e.read().decode()
    if err:
        print("ERR", err)

c.close()
