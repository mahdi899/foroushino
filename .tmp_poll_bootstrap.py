# -*- coding: utf-8 -*-
import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=15)
ch=s.get_transport().open_channel('direct-tcpip',('193.228.90.175',22),('127.0.0.1',0))
b=paramiko.SSHClient(); b.set_missing_host_key_policy(paramiko.AutoAddPolicy())
b.connect('193.228.90.175',22,'root','9%&Z5tlE63vQ28',sock=ch,timeout=20)
_,o,_=b.exec_command('pgrep -af bahram-bootstrap; echo ---; tail -30 /root/bahram-bootstrap.log 2>/dev/null',timeout=30)
print(o.read().decode('utf-8',errors='replace'))
b.close(); s.close()
