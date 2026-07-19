# -*- coding: utf-8 -*-
import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def connect():
    s = paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=15)
    ch = s.get_transport().open_channel('direct-tcpip',('193.228.90.175',22),('127.0.0.1',0))
    b = paramiko.SSHClient(); b.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    b.connect('193.228.90.175',22,'root','9%&Z5tlE63vQ28',sock=ch,timeout=20)
    return s,b

def q(c, cmd, t=60):
    _,o,e=c.exec_command(cmd,timeout=t)
    out=o.read().decode('utf-8',errors='replace')
    err=e.read().decode('utf-8',errors='replace')
    return o.channel.recv_exit_status(), out, err

s,b=connect()
print('mkdir /var/www on bahram')
print(q(b,'mkdir -p /var/www && ls -la /var/www')[1])

print('rsync from saat')
code,out,err=q(s,"sshpass -p '9%&Z5tlE63vQ28' rsync -az -e 'ssh -o StrictHostKeyChecking=no' /var/www/foroushino/ root@193.228.90.175:/var/www/foroushino/",1800)
print('rsync exit',code)
if out: print(out[-1500:])
if err: print(err[-800:])

print('verify + relaunch')
cmds=[
"ln -sfn /var/www/foroushino/bahram-cm /var/www/bahram-cm",
"test -f /var/www/bahram-cm/deploy/scripts/bootstrap-server.sh && echo REPO_OK",
"pkill -f bahram-bootstrap.sh || true",
"""cat > /etc/apt/apt.conf.d/99saat-proxy <<'EOF'
Acquire::http::Proxy "http://185.130.50.24:8888";
Acquire::https::Proxy "http://185.130.50.24:8888";
EOF""",
"rm -f /root/bahram-bootstrap.log",
"nohup env http_proxy=http://185.130.50.24:8888 https_proxy=http://185.130.50.24:8888 HTTP_PROXY=http://185.130.50.24:8888 HTTPS_PROXY=http://185.130.50.24:8888 bash /root/bahram-bootstrap.sh </dev/null >/root/bahram-bootstrap.nohup 2>&1 & echo PID=$!",
]
for c in cmds:
 code,out,err=q(b,c,30)
 print(out.strip() or err.strip())

b.close(); s.close()
