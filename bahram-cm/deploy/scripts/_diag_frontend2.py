import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
cmds = [
    f"BUILD=$(cat {APP}/frontend/.next/BUILD_ID); echo BUILD=$BUILD",
    f"curl -sk -o /dev/null -w '_next_static:%{{http_code}}\\n' -H 'Host: rostami.app' \"https://127.0.0.1/_next/static/$BUILD/_buildManifest.js\"",
    "curl -sk -H 'Host: rostami.app' --max-time 15 https://127.0.0.1/ | head -c 1200",
    "curl -sk -H 'Host: rostami.club' --max-time 15 https://127.0.0.1/ | head -c 1200",
    "curl -sk -o /dev/null -w 'family_rsc:%{http_code}\\n' -H 'Host: rostami.club' -H 'RSC: 1' --max-time 15 https://127.0.0.1/family",
    "tail -40 /var/log/pm2/bahram-frontend-error.log 2>/dev/null",
    "free -h; df -h / | tail -1",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, out, _ = c.exec_command(cmd, timeout=90)
    print(out.read().decode("utf-8", "replace")[:2500])
c.close()
