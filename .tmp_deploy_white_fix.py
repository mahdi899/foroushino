import os, paramiko, sys
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy()); c.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=30)
local=os.path.join(r'c:\Users\Msi\Desktop\foroushino','saat/frontend/src/features/admin/AdminSettingsScreen.tsx')
remote='/var/www/saat/frontend/src/features/admin/AdminSettingsScreen.tsx'
c.open_sftp().put(local, remote)
_,o,_=c.exec_command('cd /var/www/saat/frontend && npm run build && systemctl reload nginx', get_pty=True, timeout=600)
sys.stdout.buffer.write(o.read())
c.close()
print('OK')
