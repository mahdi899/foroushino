#!/usr/bin/env python3
import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env_file = Path(__file__).resolve().parents[1] / "deploy.env"
env: dict[str, str] = {}
for line in env_file.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("Connecting to", env["DEPLOY_HOST"], "...")
c.connect(
    env["DEPLOY_HOST"],
    int(env.get("DEPLOY_PORT", "22")),
    env["DEPLOY_USER"],
    env["DEPLOY_PASSWORD"],
    timeout=120,
    banner_timeout=120,
    auth_timeout=120,
)

cmds = [
    "hostname; uptime",
    "php -v 2>/dev/null | head -1 || echo NO_PHP",
    "systemctl is-active nginx php8.3-fpm php8.4-fpm 2>/dev/null; pm2 list 2>/dev/null | head -20",
    'curl -sf -o /dev/null -w "laravel:%{http_code}" http://127.0.0.1:8010/up; echo',
    'curl -sf -o /dev/null -w " next:%{http_code}" http://127.0.0.1:3000/; echo',
    "grep php8 /etc/nginx/conf.d/rostami-upstreams.conf 2>/dev/null || true",
    "ls -la /var/www/bahram-cm/deploy/scripts/upgrade-php-8.4.sh 2>/dev/null || echo NO_UPGRADE_SCRIPT",
]
for cmd in cmds:
    print("\n===", cmd[:70], "===")
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode("utf-8", "replace") + e.read().decode("utf-8", "replace"))
c.close()
