#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=60)

cmds = [
    "grep -i cloudflare /var/www/saat/backend/.env 2>/dev/null || echo 'no cf in env'",
    "grep -i cloudflare /var/www/saat/backend/.env.example 2>/dev/null | head -5",
    "cd /var/www/saat && git status -sb | head -5",
    "cd /var/www/saat/backend && php artisan tinker --execute=\"echo json_encode(\\App\\Models\\AppSetting::allKeyed());\" 2>/dev/null | head -c 500",
]

for cmd in cmds:
    print("===", cmd, "===")
    _, o, e = c.exec_command(cmd, timeout=120)
    print(o.read().decode()[:2000])
    err = e.read().decode()
    if err.strip():
        print("ERR", err[:500])

c.close()
