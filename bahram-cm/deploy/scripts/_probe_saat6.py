#!/usr/bin/env python3
from pathlib import Path
import paramiko

ENV_FILE = Path(__file__).resolve().parents[1] / "deploy.env"
env = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=90)

C = "curl -sk --connect-timeout 5 --max-time 15"

cmds = [
    f"{C} -o /dev/null -w 'health_cf:%{{http_code}}\\n' https://sat.center/api/v1/health",
    f"{C} -o /dev/null -w 'admin_settings:%{{http_code}}\\n' https://sat.center/api/v1/admin/settings -H 'Accept: application/json'",
    f"{C} -o /dev/null -w 'admin_backup:%{{http_code}}\\n' https://sat.center/api/v1/admin/backup -H 'Accept: application/json'",
    f"{C} -o /dev/null -w 'me:%{{http_code}}\\n' https://sat.center/api/v1/me -H 'Accept: application/json'",
    f"{C} -o /dev/null -w 'products:%{{http_code}}\\n' https://sat.center/api/v1/products -H 'Accept: application/json'",
    f"{C} https://sat.center/api/v1/admin/settings -H 'Accept: application/json' | head -c 200",
    f"{C} -X POST https://sat.center/api/v1/auth/password-login -H 'Content-Type: application/json' -d '{{\"phone\":\"09120000001\",\"password\":\"x\"}}' | head -c 200",
    f"dig +short sat.center @1.1.1.1",
]
for cmd in cmds:
    print("===", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=25)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err[:200])
c.close()
