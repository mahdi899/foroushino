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
    "curl -sk -o /dev/null -w 'POST_club_root:%{http_code} time:%{time_total}s\\n' -X POST -H 'Host: rostami.club' -H 'Content-Type: text/plain;charset=UTF-8' -H 'RSC: 1' -H 'Next-Router-State-Tree: %5B%22%22%5D' --max-time 30 -d '' https://127.0.0.1/",
    "curl -sk -o /dev/null -w 'POST_app_root:%{http_code} time:%{time_total}s\\n' -X POST -H 'Host: rostami.app' -H 'RSC: 1' --max-time 30 -d '' https://127.0.0.1/",
    "curl -sk -o /dev/null -w 'GET_panel:%{http_code}\\n' -H 'Host: rostami.app' --max-time 15 https://127.0.0.1/panel/login",
    "curl -sk -o /dev/null -w 'GET_admin:%{http_code}\\n' -H 'Host: rostami.app' --max-time 15 https://127.0.0.1/admin/login",
    "tail -5 /var/log/nginx/error.log",
    "pm2 logs bahram-frontend --lines 8 --nostream 2>&1 | tail -12",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, out, _ = c.exec_command(cmd, timeout=60)
    print(out.read().decode("utf-8", "replace"))
c.close()
