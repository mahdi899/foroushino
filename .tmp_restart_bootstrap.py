# -*- coding: utf-8 -*-
import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

LOCAL = r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy\scripts\remote-bootstrap-all.sh"

s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=15)

# ensure tunnel alive
s.exec_command("pgrep -f 'ssh -N -R 127.0.0.1:8888' || nohup sshpass -p '9%&Z5tlE63vQ28' ssh -N -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 127.0.0.1:8888:127.0.0.1:8888 root@193.228.90.175 </dev/null >/root/bahram-proxy-tunnel.log 2>&1 &", timeout=15)

ch=s.get_transport().open_channel('direct-tcpip',('193.228.90.175',22),('127.0.0.1',0))
b=paramiko.SSHClient(); b.set_missing_host_key_policy(paramiko.AutoAddPolicy())
b.connect('193.228.90.175',22,'root','9%&Z5tlE63vQ28',sock=ch,timeout=20)

sf=b.open_sftp(); sf.put(LOCAL,'/root/bahram-bootstrap.sh'); sf.chmod('/root/bahram-bootstrap.sh',0o755); sf.close()

cmd="""
pkill -9 -f bahram-bootstrap.sh || true
pkill -9 apt-get || true
sleep 3
rm -f /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock* /var/lock/bahram-bootstrap.lock
dpkg --configure -a || true
echo '=== RESTART $(date -Is) ===' >> /root/bahram-bootstrap.log
nohup bash /root/bahram-bootstrap.sh </dev/null >>/root/bahram-bootstrap.nohup 2>&1 & echo PID=$!
sleep 10
tail -15 /root/bahram-bootstrap.log
"""
_,o,_=b.exec_command(cmd,timeout=40)
print(o.read().decode('utf-8',errors='replace'))
b.close(); s.close()
