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
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
cmds = [
    f"ls {APP}/frontend/.next/static/chunks/*.js 2>/dev/null | wc -l",
    f"du -sh {APP}/frontend/.next/static",
    "curl -sk -I -H 'Host: rostami.app' https://127.0.0.1/ | grep -iE 'cache|cf-|age'",
    "curl -sk -I -H 'Host: rostami.app' https://127.0.0.1/_next/static/chunks/0k6c9i47ki3cm.js | grep -iE 'cache|cf-|age'",
    "grep -r 'Cache-Control' /etc/nginx/snippets/next-static.conf 2>/dev/null | head -5",
]
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, out, _ = c.exec_command(cmd, timeout=30)
    print(out.read().decode("utf-8", "replace"))
c.close()
