# -*- coding: utf-8 -*-
import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def connect():
    s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect('185.130.50.24',22,'root','45J8pr+1gU=65e',timeout=15)
    ch=s.get_transport().open_channel('direct-tcpip',('193.228.90.175',22),('127.0.0.1',0))
    b=paramiko.SSHClient(); b.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    b.connect('193.228.90.175',22,'root','9%&Z5tlE63vQ28',sock=ch,timeout=20)
    return s,b

def q(c,cmd,t=120):
    _,o,e=c.exec_command(cmd,timeout=t)
    return o.read().decode('utf-8',errors='replace'), e.read().decode('utf-8',errors='replace'), o.channel.recv_exit_status()

s,b=connect()
cleanup="""
pkill -9 -f bahram-bootstrap.sh || true
pkill -9 apt-get || true
pkill -9 -f 'apt-get' || true
sleep 2
rm -f /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock*
dpkg --configure -a || true
"""
print(q(b,cleanup,60)[0])

# test proxy works
test="""
export http_proxy=http://185.130.50.24:8888
export https_proxy=http://185.130.50.24:8888
curl -sI --max-time 15 https://github.com | head -2
"""
print('proxy test:', q(b,test,30)[0])

launch="""
cat > /etc/apt/apt.conf.d/99saat-proxy <<'EOF'
Acquire::http::Proxy "http://185.130.50.24:8888";
Acquire::https::Proxy "http://185.130.50.24:8888";
EOF
rm -f /root/bahram-bootstrap.log
nohup env http_proxy=http://185.130.50.24:8888 https_proxy=http://185.130.50.24:8888 HTTP_PROXY=http://185.130.50.24:8888 HTTPS_PROXY=http://185.130.50.24:8888 bash /root/bahram-bootstrap.sh </dev/null >/root/bahram-bootstrap.nohup 2>&1 & echo PID=$!
sleep 5
tail -15 /root/bahram-bootstrap.log
"""
print(q(b,launch,30)[0])
b.close(); s.close()
