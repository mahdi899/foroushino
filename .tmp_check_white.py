import paramiko, sys
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy()); c.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=30)
cmds=[
"curl -sS -o /dev/null -w 'index:%{http_code}\\n' --resolve sat.center:443:127.0.0.1 -k https://sat.center/",
"grep -o 'index-[^\" ]*\\.js' /var/www/saat/frontend/dist/index.html | head -1",
"ls -la /var/www/saat/frontend/dist/assets/index-*.js | tail -3",
"tail -n 30 /var/www/saat/backend/storage/logs/laravel.log",
"cd /var/www/saat/backend && php artisan route:list --path=admin/settings",
]
for cmd in cmds:
 sys.stdout.buffer.write(f'\\n=== {cmd[:70]} ===\\n'.encode())
 _,o,_=c.exec_command(cmd,get_pty=True,timeout=60)
 sys.stdout.buffer.write(o.read())
c.close()
