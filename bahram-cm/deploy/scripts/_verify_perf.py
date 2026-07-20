import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

cmds = [
    "grep -r 'rostami.app/api' /var/www/foroushino/bahram-family-manager/build/web/main.dart.js 2>/dev/null | head -1 || echo NO_APP_API",
    "grep -r 'rostami.club/api' /var/www/foroushino/bahram-family-manager/build/web/main.dart.js 2>/dev/null | head -1 || echo NO_CLUB_API",
    'curl -sk -o /dev/null -w "club_branding:%{http_code} time:%{time_total}s\\n" -H "Host: rostami.club" https://127.0.0.1/api/v1/family/branding',
    'curl -sk -o /dev/null -w "family_home:%{http_code} time:%{time_total}s\\n" -H "Host: rostami.club" https://127.0.0.1/family',
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, out, _ = c.exec_command(cmd, timeout=60)
    print(out.read().decode("utf-8", "replace")[:500])
c.close()
