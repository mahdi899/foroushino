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
FLUTTER_BIN = f"{FLUTTER}/../.tools/flutter/bin/flutter"
cmd = f"""
set -e
cd {FLUTTER}
{FLUTTER_BIN} build web --release --base-href=/admin/ --dart-define=API_BASE_URL=https://rostami.club/api/v1
pm2 restart family-manager-web
grep -o 'https://[^\"]*api/v1' build/web/main.dart.js | head -3
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, stdout, stderr = c.exec_command(cmd, timeout=1800)
print(stdout.read().decode("utf-8", "replace"))
err = stderr.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR:", err[-3000:])
c.close()
