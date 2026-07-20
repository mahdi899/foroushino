import io
import sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
cmds = [
    "test -f /tmp/bahram-deploy-backup.done && cat /tmp/bahram-deploy-backup.done || echo NO_DONE",
    "tail -120 /tmp/bahram-deploy-backup.log 2>/dev/null || echo NO_LOG",
    "cd /var/www/foroushino && git rev-parse --short HEAD",
    "pm2 list | head -10",
    'curl -sf -o /dev/null -w "laravel:%{http_code}\\n" http://127.0.0.1:8010/up || echo laravel_fail',
    'curl -sf -o /dev/null -w "next:%{http_code}\\n" http://127.0.0.1:3000/ || echo next_fail',
]
for cmd in cmds:
    print("===", cmd[:80], "===")
    _, out, err = c.exec_command(cmd, timeout=60)
    print(out.read().decode("utf-8", "replace"))
    e = err.read().decode("utf-8", "replace")
    if e.strip():
        print("ERR", e)
c.close()
