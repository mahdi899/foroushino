# -*- coding: utf-8 -*-
import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=15)
ch=s.get_transport().open_channel('direct-tcpip',('193.228.90.175',22),('127.0.0.1',0))
b=paramiko.SSHClient(); b.set_missing_host_key_policy(paramiko.AutoAddPolicy())
b.connect('193.228.90.175',22,'root','9%&Z5tlE63vQ28',sock=ch,timeout=20)
cmds=[
"ps aux | grep -E 'apt|dpkg|bahram-bootstrap' | grep -v grep",
"timeout 10 bash -c 'echo > /dev/tcp/185.130.50.24/8888' && echo proxy_port_ok || echo proxy_port_fail",
"curl -sI --max-time 15 -x http://185.130.50.24:8888 https://archive.ubuntu.com/ubuntu/ | head -3",
"tail -20 /var/log/tinyproxy/tinyproxy.log 2>/dev/null | tail -5",
]
for c in cmds:
 print('===',c)
 _,o,e=b.exec_command(c,timeout=25)
 print(o.read().decode('utf-8',errors='replace'))
 print(e.read().decode('utf-8',errors='replace'))
b.close(); s.close()
