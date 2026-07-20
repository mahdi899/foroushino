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
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=60)

cmds = [
    "for ip in 185.130.50.24 185.130.50.129 193.228.90.175; do echo IP=$ip; curl -sk --connect-timeout 3 -o /dev/null -w 'health:%{http_code}\\n' -H 'Host: sat.center' https://$ip/api/v1/health || echo fail; done",
    "curl -sk https://sat.center/api/v1/health",
    "curl -sk -X POST https://sat.center/api/v1/auth/dev-login -H 'Content-Type: application/json' -d '{\"phone\":\"09120000000\"}'",
    "dig +short sat.center @1.1.1.1",
]
for cmd in cmds:
    print("===", cmd[:90])
    _, o, e = c.exec_command(cmd, timeout=45)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err)
c.close()
