import io
import sys
import time
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

remote = """#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-deploy-manual.log
exec > >(tee "$LOG") 2>&1
echo "=== MANUAL DEPLOY $(date -Is) ==="
cd /var/www/bahram-cm
bash deploy/scripts/deploy.sh
echo "=== HEALTH ==="
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK || echo LARAVEL_FAIL
curl -sf -o /dev/null -w "NEXT:%{http_code}\\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "BAHRAM:%{http_code}\\n" -H "Host: rostami.app" http://127.0.0.1/
curl -sf -o /dev/null -w "FAMILY:%{http_code}\\n" -H "Host: rostami.club" http://127.0.0.1/
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-deploy-manual.sh", "w") as fh:
    fh.write(remote)
sftp.chmod("/tmp/bahram-deploy-manual.sh", 0o755)
sftp.close()

c.exec_command(
    "rm -f /tmp/bahram-deploy-manual.done; "
    "nohup bash /tmp/bahram-deploy-manual.sh; "
    "echo $? > /tmp/bahram-deploy-manual.done",
    timeout=30,
)
print("Manual deploy started on", env["DEPLOY_HOST"])

for i in range(120):
    time.sleep(20)
    _, stdout, _ = c.exec_command(
        "test -f /tmp/bahram-deploy-manual.done && echo FIN || echo RUN; "
        "tail -1 /tmp/bahram-deploy-manual.log 2>/dev/null",
        timeout=60,
    )
    lines = stdout.read().decode().strip().split("\n")
    status = lines[0] if lines else "?"
    tail = lines[-1] if len(lines) > 1 else ""
    print(f"[{i * 20:4d}s] {status} | {tail[-140:]}")

    if status == "FIN":
        _, stdout, _ = c.exec_command(
            "cat /tmp/bahram-deploy-manual.done; tail -60 /tmp/bahram-deploy-manual.log",
            timeout=120,
        )
        print(stdout.read().decode("utf-8", "replace"))
        break
else:
    print("TIMEOUT")
    _, stdout, _ = c.exec_command("tail -40 /tmp/bahram-deploy-manual.log", timeout=60)
    print(stdout.read().decode("utf-8", "replace"))

c.close()
