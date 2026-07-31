import paramiko
from pathlib import Path

cfg = {}
for line in Path("bahram-cm/deploy/deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["DEPLOY_HOST"], username=cfg["DEPLOY_USER"], password=cfg["DEPLOY_PASSWORD"], timeout=60)

script = """
cd /var/www/foroushino && git rev-parse --short HEAD
test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && echo BUILD_ID=$(cat /var/www/bahram-cm/frontend/.next/BUILD_ID) || echo no BUILD_ID
pgrep -af 'next build' || echo no next build
curl -sf -m 5 -o /dev/null -w 'Laravel: %{http_code}\n' http://127.0.0.1:8010/up || echo Laravel fail
curl -sf -m 5 -o /dev/null -w 'Next: %{http_code}\n' http://127.0.0.1:3000/ || echo Next fail
"""

_, stdout, stderr = c.exec_command(script, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
Path(".tmp/server-check.txt").write_text(out, encoding="utf-8")
print("written .tmp/server-check.txt")
c.close()
