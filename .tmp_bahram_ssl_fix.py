# -*- coding: utf-8 -*-
import os
import posixpath
import paramiko
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

LOCAL_ROOT = r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy"
REMOTE_ROOT = "/var/www/foroushino/bahram-cm/deploy"

def connect_bahram():
    saat = paramiko.SSHClient()
    saat.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    saat.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=15)
    ch = saat.get_transport().open_channel("direct-tcpip", ("193.228.90.175", 22), ("127.0.0.1", 0))
    bahram = paramiko.SSHClient()
    bahram.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    bahram.connect("193.228.90.175", 22, "root", "9%&Z5tlE63vQ28", sock=ch, timeout=20)
    return saat, bahram

def upload_tree(sftp, local_dir, remote_dir):
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir).replace("\\", "/")
        remote_path = remote_dir if rel == "." else posixpath.join(remote_dir, rel)
        try:
            sftp.stat(remote_path)
        except OSError:
            sftp.mkdir(remote_path)
        for name in files:
            local_file = os.path.join(root, name)
            remote_file = posixpath.join(remote_path, name)
            print("upload", remote_file)
            sftp.put(local_file, remote_file)

def run(client, cmd, timeout=1800):
    print("\n==>", cmd[:120])
    _, out, err = client.exec_command(cmd, timeout=timeout)
    text = out.read().decode("utf-8", errors="replace")
    err_text = err.read().decode("utf-8", errors="replace")
    if text:
        print(text[-4000:])
    if err_text:
        print("ERR:", err_text[-2000:])
    return text

saat, bahram = connect_bahram()
sftp = bahram.open_sftp()
upload_tree(sftp, LOCAL_ROOT, REMOTE_ROOT)
sftp.close()

run(bahram, "chmod +x /var/www/foroushino/bahram-cm/deploy/scripts/*.sh")
run(bahram, "ln -sfn /var/www/foroushino/bahram-cm /var/www/bahram-cm")
run(bahram, "test -f /var/www/bahram-cm/deploy/scripts/setup-origin-ssl.sh && echo SSL_SCRIPT_OK")

proxy_env = (
    "export http_proxy=http://127.0.0.1:8888 https_proxy=http://127.0.0.1:8888 "
    "HTTP_PROXY=http://127.0.0.1:8888 HTTPS_PROXY=http://127.0.0.1:8888 "
    "PROXY_SHARED_TOKEN=abXgwdBJrq1k8EiUUcp3B62ELu4fn41iDQyIrIVDetWz2Z3S9VRBqhcBzaLGXdIA "
    "SAT_SYNC_HMAC_SECRET=1e054cf9e82ca0a0bdecc9a269ec1605855750b1f64d5848181212c3b1feb3cf "
    "TELEGRAM_WEBHOOK_SECRET=iGZmon1E5364a9DofD52snaT8LauUdKv "
    "TELEGRAM_WEBHOOK_BASE_URL=https://broken-mountain-6b4f.shokspy.workers.dev "
    "SITE_URL=https://rostami.app FAMILY_URL=https://rostami.club "
    "CDN_URL=https://cdn.rostami.app FAMILY_CDN_URL=https://family-cdn.rostami.club"
)

run(bahram, f"{proxy_env} && bash /var/www/bahram-cm/deploy/scripts/setup-origin-ssl.sh", timeout=3600)
run(bahram, f"{proxy_env} && bash /var/www/bahram-cm/deploy/scripts/apply-shared-secrets.sh", timeout=600)
run(
    bahram,
    "cd /var/www/bahram-cm/backend && php artisan config:clear && php artisan config:cache && "
    "php artisan telegram:sync-bots || true && php artisan telegram:webhook:set production || true",
    timeout=600,
)
run(bahram, "pm2 list; curl -sI http://127.0.0.1:3000/ | head -5; curl -sI https://rostami.app/ 2>&1 | head -8")

bahram.close()
saat.close()
print("DONE")
