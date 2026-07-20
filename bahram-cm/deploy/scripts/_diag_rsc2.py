import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

remote = """#!/bin/bash
curl -sk -D /tmp/rsc.hdr -o /tmp/rsc.body \\
  -X POST 'https://127.0.0.1/' \\
  -H 'Host: rostami.club' \\
  -H 'Accept: text/x-component' \\
  -H 'Content-Type: text/plain;charset=UTF-8' \\
  -H 'RSC: 1' \\
  -H 'Next-Router-State-Tree: %5B%22%22%2C%7B%22children%22%3A%5B%22family%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D' \\
  --max-time 30 -d '[]'
echo '=== HEADERS ==='
head -15 /tmp/rsc.hdr
echo '=== BODY ==='
head -c 2000 /tmp/rsc.body
echo
pm2 logs bahram-frontend --lines 20 --nostream 2>&1 | tail -25
"""
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/rsc-test.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/rsc-test.sh", 0o755)
sftp.close()
_, out, _ = c.exec_command("bash /tmp/rsc-test.sh", timeout=90)
print(out.read().decode("utf-8", "replace"))
c.close()
