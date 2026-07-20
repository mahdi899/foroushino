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
    "pm2 describe bahram-frontend | grep -E 'restarts|status|uptime|unstable'",
    "grep -E 'ENOMEM|Killed|fatal|FATAL|JavaScript heap|crash' /var/log/pm2/bahram-frontend-error.log | tail -20",
    "journalctl -u nginx --since '30 min ago' --no-pager 2>/dev/null | tail -10 || true",
    f"ls -la {APP}/frontend/.next/server/app/family/page.js 2>/dev/null | head -1",
    "for i in 1 2 3; do curl -sf -o /dev/null -w \"try$i:%{http_code} \" http://127.0.0.1:3000/; done; echo",
    "pm2 save",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:70], "===")
    _, out, _ = c.exec_command(cmd, timeout=60)
    print(out.read().decode("utf-8", "replace"))
c.close()
