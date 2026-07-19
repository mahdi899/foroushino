# -*- coding: utf-8 -*-
"""Bahram deploy orchestrator via Saat jump host."""
import paramiko
import sys
import io
import time
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SAAT = ("185.130.50.24", "root", "45J8pr+1gU=65e")
BAHRAM = ("193.228.90.175", "root", "9%&Z5tlE63vQ28")
LOCAL_SCRIPT = r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy\scripts\remote-bootstrap-all.sh"
REMOTE_SCRIPT = "/root/bahram-bootstrap.sh"


def connect_bahram():
    saat = paramiko.SSHClient()
    saat.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    saat.connect(SAAT[0], 22, SAAT[1], SAAT[2], timeout=15)
    ch = saat.get_transport().open_channel("direct-tcpip", (BAHRAM[0], 22), ("127.0.0.1", 0))
    bahram = paramiko.SSHClient()
    bahram.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    bahram.connect(BAHRAM[0], 22, BAHRAM[1], BAHRAM[2], sock=ch, timeout=20)
    return saat, bahram


def run(bahram, cmd, timeout=60):
    _, o, e = bahram.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    return code, out, err


def run_saat(saat, cmd, timeout=600):
    _, o, e = saat.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    return code, out, err


def main():
    saat = paramiko.SSHClient()
    saat.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    saat.connect(SAAT[0], 22, SAAT[1], SAAT[2], timeout=15)

    print("==> Setup tinyproxy on saat for bahram egress")
    proxy_setup = r"""
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq tinyproxy sshpass rsync
cat > /etc/tinyproxy/tinyproxy.conf <<'EOF'
User tinyproxy
Group tinyproxy
Port 8888
Timeout 600
DefaultErrorFile "/usr/share/tinyproxy/default.html"
StatFile "/usr/share/tinyproxy/stats.html"
LogFile "/var/log/tinyproxy/tinyproxy.log"
PidFile "/run/tinyproxy/tinyproxy.pid"
MaxClients 50
Allow 127.0.0.1
Allow 193.228.90.175
ViaProxyName "tinyproxy"
ConnectPort 443
ConnectPort 80
EOF
systemctl enable --now tinyproxy
systemctl restart tinyproxy
ss -tlnp | grep 8888 || true
"""
    code, out, err = run_saat(saat, proxy_setup, 300)
    print(out)
    if err:
        print(err)
    if code != 0:
        print("proxy setup failed", code)
        saat.close()
        sys.exit(1)

    print("==> Prepare repo on saat if missing")
    run_saat(saat, """
mkdir -p /var/www
if [ ! -d /var/www/foroushino/.git ]; then
  git clone --branch main --depth 1 https://github.com/mahdi899/foroushino.git /var/www/foroushino
else
  cd /var/www/foroushino && git pull --ff-only origin main || true
fi
""", 600)

    print("==> Cleanup bahram + upload bootstrap script")
    saat2, bahram = connect_bahram()
    saat.close()
    saat = saat2

    cleanup = """
pkill -9 apt-get 2>/dev/null || true
pkill -9 -f 'apt-get update' 2>/dev/null || true
rm -f /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock*
dpkg --configure -a || true
mkdir -p /var/www
"""
    run(bahram, cleanup, 120)

    sftp = bahram.open_sftp()
    sftp.put(LOCAL_SCRIPT, REMOTE_SCRIPT)
    sftp.chmod(REMOTE_SCRIPT, 0o755)
    sftp.close()

    print("==> Rsync repo saat -> bahram")
    rsync_cmd = (
        "sshpass -p '9%&Z5tlE63vQ28' rsync -az --delete "
        "-e 'ssh -o StrictHostKeyChecking=no' "
        "/var/www/foroushino/ root@193.228.90.175:/var/www/foroushino/"
    )
    code, out, err = run_saat(saat, rsync_cmd, 1800)
    print(out[-2000:] if len(out) > 2000 else out)
    if err:
        print(err[-1000:])
    if code != 0:
        print("rsync failed", code)

    run(bahram, "ln -sfn /var/www/foroushino/bahram-cm /var/www/bahram-cm && ls /var/www/bahram-cm/deploy/scripts/", 30)

    print("==> Launch bootstrap with apt proxy via saat")
    launch = """
export http_proxy=http://185.130.50.24:8888
export https_proxy=http://185.130.50.24:8888
export HTTP_PROXY=http://185.130.50.24:8888
export HTTPS_PROXY=http://185.130.50.24:8888
cat > /etc/apt/apt.conf.d/99saat-proxy <<'EOF'
Acquire::http::Proxy "http://185.130.50.24:8888";
Acquire::https::Proxy "http://185.130.50.24:8888";
EOF
rm -f /root/bahram-bootstrap.log
nohup env http_proxy=http://185.130.50.24:8888 https_proxy=http://185.130.50.24:8888 HTTP_PROXY=http://185.130.50.24:8888 HTTPS_PROXY=http://185.130.50.24:8888 bash /root/bahram-bootstrap.sh </dev/null >/root/bahram-bootstrap.nohup 2>&1 & echo PID=$!
"""
    code, out, err = run(bahram, launch, 30)
    print(out, err)

    bahram.close()
    saat.close()
    print("Bootstrap launched")


if __name__ == "__main__":
    main()
