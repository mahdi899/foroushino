#!/usr/bin/env python3
from pathlib import Path
import paramiko

ROOT = Path(__file__).resolve().parents[3]
env = {}
for line in (ROOT / "saat" / "deploy" / "deploy.env").read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=90)
for cmd in [
    "ps aux | grep -E 'saat-deploy|deploy.sh|npm run build' | grep -v grep | head -10",
    "tail -30 /tmp/saat-deploy-fix.log 2>/dev/null || echo NO_LOG",
    "cd /var/www/foroushino && git rev-parse --short HEAD",
]:
    print("===", cmd)
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode("utf-8", errors="replace"))
c.close()
