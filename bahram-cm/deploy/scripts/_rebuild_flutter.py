import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

FLUTTER = "/var/www/foroushino/bahram-family-manager"
cmd = f"API_BASE_URL=https://rostami.club/api/v1 bash {FLUTTER}/scripts/build-web-production.sh && pm2 restart family-manager-web && pm2 save && curl -sf -o /dev/null -w 'admin:%{{http_code}}\\n' -H 'Host: rostami.club' http://127.0.0.1/admin/"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, stdout, stderr = c.exec_command(cmd, timeout=1800)
print(stdout.read().decode("utf-8", "replace"))
err = stderr.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR:", err[-2000:])
c.close()
