# -*- coding: utf-8 -*-
import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

def q(c, cmd, t=60):
    _, o, e = c.exec_command(cmd, timeout=t)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    return o.channel.recv_exit_status(), out, err

saat = paramiko.SSHClient()
saat.set_missing_host_key_policy(paramiko.AutoAddPolicy())
saat.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=15)

# open ufw for bahram + ensure tinyproxy
q(saat, "ufw allow from 193.228.90.175 to any port 8888 proto tcp 2>/dev/null; ufw status | grep 8888 || true", 30)

ch = saat.get_transport().open_channel("direct-tcpip", ("193.228.90.175", 22), ("127.0.0.1", 0))
bahram = paramiko.SSHClient()
bahram.set_missing_host_key_policy(paramiko.AutoAddPolicy())
bahram.connect("193.228.90.175", 22, "root", "9%&Z5tlE63vQ28", sock=ch, timeout=20)

# kill stuck bootstrap/apt
q(bahram, "pkill -9 -f bahram-bootstrap.sh; pkill -9 apt-get; sleep 2; rm -f /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock*; dpkg --configure -a || true", 60)

# setup reverse SSH tunnel saat->bahram (background on saat)
q(saat, "pkill -f 'ssh -N -R 127.0.0.1:8888' || true", 15)
tunnel_cmd = (
    "nohup sshpass -p '9%&Z5tlE63vQ28' ssh -N "
    "-o StrictHostKeyChecking=no -o ServerAliveInterval=30 "
    "-R 127.0.0.1:8888:127.0.0.1:8888 root@193.228.90.175 "
    "</dev/null >/root/bahram-proxy-tunnel.log 2>&1 & echo TUNNEL_PID=$!"
)
code, out, err = q(saat, tunnel_cmd, 20)
print("tunnel:", out, err)
time.sleep(3)

# test proxy via localhost tunnel on bahram
code, out, err = q(bahram, "curl -sI --max-time 15 -x http://127.0.0.1:8888 https://github.com | head -3", 25)
print("curl via tunnel:", out or err)

# update apt proxy to localhost and relaunch bootstrap
launch = """
cat > /etc/apt/apt.conf.d/99saat-proxy <<'EOF'
Acquire::http::Proxy "http://127.0.0.1:8888";
Acquire::https::Proxy "http://127.0.0.1:8888";
EOF
rm -f /root/bahram-bootstrap.log
nohup env http_proxy=http://127.0.0.1:8888 https_proxy=http://127.0.0.1:8888 HTTP_PROXY=http://127.0.0.1:8888 HTTPS_PROXY=http://127.0.0.1:8888 bash /root/bahram-bootstrap.sh </dev/null >/root/bahram-bootstrap.nohup 2>&1 & echo PID=$!
sleep 8
tail -20 /root/bahram-bootstrap.log
"""
print(q(bahram, launch, 40)[1])

bahram.close()
saat.close()
