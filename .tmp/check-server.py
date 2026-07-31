import paramiko
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

cfg = {}
for line in Path("bahram-cm/deploy/deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["DEPLOY_HOST"], username=cfg["DEPLOY_USER"], password=cfg["DEPLOY_PASSWORD"], timeout=60)

cmds = [
    "cd /var/www/foroushino && git rev-parse --short HEAD",
    "test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && echo BUILD_ID=$(cat /var/www/bahram-cm/frontend/.next/BUILD_ID)",
    "pgrep -af 'next build' || echo no next build running",
    "curl -sf -o /dev/null -w 'Laravel: %{http_code}\n' http://127.0.0.1:8010/up",
    "curl -sf -o /dev/null -w 'Next: %{http_code}\n' http://127.0.0.1:3000/",
    "curl -sf -o /dev/null -w 'Site: %{http_code}\n' https://rostami.app/",
]
for cmd in cmds:
    print("---", cmd)
    _, stdout, stderr = c.exec_command(cmd)
    print(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err:
        print(err)
c.close()
