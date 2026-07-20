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
    "pm2 list",
    "curl -sf -o /dev/null -w 'next_local:%{http_code} time:%{time_total}s\\n' --max-time 10 http://127.0.0.1:3000/ || echo next_local=FAIL",
    "curl -sf -o /dev/null -w 'laravel:%{http_code}\\n' --max-time 5 http://127.0.0.1:8010/up || echo laravel=FAIL",
    "curl -sk -o /dev/null -w 'rostami_app:%{http_code}\\n' -H 'Host: rostami.app' --max-time 10 https://127.0.0.1/",
    "curl -sk -o /dev/null -w 'rostami_club:%{http_code}\\n' -H 'Host: rostami.club' --max-time 10 https://127.0.0.1/",
    "curl -sk -o /dev/null -w 'club_admin:%{http_code}\\n' -H 'Host: rostami.club' --max-time 10 https://127.0.0.1/admin/",
    "ss -tlnp | grep -E ':3000|:8010|:7358' || netstat -tlnp 2>/dev/null | grep -E ':3000|:8010|:7358'",
    f"test -f {APP}/frontend/.next/BUILD_ID && echo BUILD_ID=$(cat {APP}/frontend/.next/BUILD_ID) || echo NO_BUILD",
    "pm2 logs bahram-frontend --lines 25 --nostream 2>&1 | tail -30",
    "tail -15 /var/log/nginx/error.log 2>/dev/null",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:72], "===")
    _, out, err = c.exec_command(cmd, timeout=60)
    o = out.read().decode("utf-8", "replace")
    e = err.read().decode("utf-8", "replace")
    print(o)
    if e.strip():
        print("ERR:", e[:300])
c.close()
