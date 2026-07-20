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

def run(cmd, t=45):
    print("===", cmd[:110])
    _, o, e = c.exec_command(cmd, timeout=t)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out[:2000])
    if err.strip():
        print("ERR:", err[:300])

run("curl -sk -o /dev/null -w 'admin_settings:%{http_code}\\n' https://sat.center/api/v1/admin/settings -H 'Accept: application/json'")
run("curl -sk https://sat.center/api/v1/admin/settings -H 'Accept: application/json' | head -c 250")
run("curl -sk -X POST https://sat.center/api/v1/auth/phone-otp/request -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{\"phone\":\"09120000001\"}' | head -c 350")
run("curl -sk -X POST -H 'Host: sat.center' https://185.130.50.24/api/v1/auth/phone-otp/request -H 'Content-Type: application/json' -d '{\"phone\":\"09120000001\"}' | head -c 350")
run("JS=$(curl -sk https://sat.center/ | grep -oE '/assets/index-[^\"]+\\.js' | head -1); echo JS=$JS; curl -sk \"https://sat.center$JS\" | grep -oE 'localhost:8000|127\\.0\\.0\\.1:8000|/api/v1' | sort -u | head -5")
run("curl -skI https://sat.center/api/v1/health | grep -iE 'server|cf-|content-type'")
run("dig +short sat.center @1.1.1.1")
c.close()
