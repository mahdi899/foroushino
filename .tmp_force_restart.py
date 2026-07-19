# -*- coding: utf-8 -*-
import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=15)
ch=s.get_transport().open_channel('direct-tcpip',('193.228.90.175',22),('127.0.0.1',0))
b=paramiko.SSHClient(); b.set_missing_host_key_policy(paramiko.AutoAddPolicy())
b.connect('193.228.90.175',22,'root','9%&Z5tlE63vQ28',sock=ch,timeout=20)
cmds=[
"ps -p 5124 -o pid,cmd 2>/dev/null || echo gone",
"kill -9 5124 2>/dev/null; pkill -9 apt-get; pkill -9 -f bahram-bootstrap; sleep 2; ps aux | grep apt | grep -v grep || echo no_apt",
"rm -f /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock* /var/lock/bahram-bootstrap.lock",
"curl -sI --max-time 8 -x http://127.0.0.1:8888 https://github.com | head -1 || echo proxy_down",
"nohup bash /root/bahram-bootstrap.sh </dev/null >>/root/bahram-bootstrap.nohup 2>&1 & echo PID=$!",
"sleep 12; tail -10 /root/bahram-bootstrap.log; pgrep -af bahram-bootstrap",
]
for c in cmds:
 print('>>',c[:70])
 _,o,e=b.exec_command(c,timeout=40)
 print(o.read().decode('utf-8',errors='replace'))
b.close(); s.close()
