import os
import paramiko
import sys

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"
APP = "/var/www/saat"

FILES = [
    ("saat/frontend/src/lib/pooledAll.ts", f"{APP}/frontend/src/lib/pooledAll.ts"),
    ("saat/frontend/src/services/sync.ts", f"{APP}/frontend/src/services/sync.ts"),
    ("saat/frontend/src/providers/SyncProvider.tsx", f"{APP}/frontend/src/providers/SyncProvider.tsx"),
]

ROOT = r"c:\Users\Msi\Desktop\foroushino"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = client.open_sftp()

for local_rel, remote in FILES:
    local = os.path.join(ROOT, local_rel.replace("/", os.sep))
    sys.stdout.buffer.write(f"upload {local_rel} -> {remote}\n".encode())
    sftp.put(local, remote)
sftp.close()

cmds = [
    f"cd {APP}/frontend && npm run build",
    "systemctl reload nginx",
    "curl -sS -o /dev/null -w 'health:%{http_code} %{time_total}s\\n' --resolve sat.center:443:127.0.0.1 -k https://sat.center/api/v1/health",
]
for cmd in cmds:
    sys.stdout.buffer.write(f"\n$ {cmd}\n".encode())
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))

client.close()
print("DEPLOY_OK", file=sys.stderr)
