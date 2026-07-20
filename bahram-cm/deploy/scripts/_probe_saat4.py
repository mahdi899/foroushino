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

cmds = [
    # CF vs origin
    "curl -sk -o /dev/null -w 'cf_health:%{http_code}\\n' https://sat.center/api/v1/health",
    "curl -sk -o /dev/null -w 'origin_health:%{http_code}\\n' -H 'Host: sat.center' https://185.130.50.24/api/v1/health",
    # backup routes (new feature)
    "curl -sk -o /dev/null -w 'admin_backup:%{http_code}\\n' https://sat.center/api/v1/admin/backup -H 'Accept: application/json'",
    "curl -sk https://sat.center/api/v1/admin/backup -H 'Accept: application/json' | head -c 300",
    # phone otp request (no auth)
    "curl -sk -X POST https://sat.center/api/v1/auth/request-phone-otp -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{\"phone\":\"09120000001\"}' | head -c 400",
    # nginx/php errors in response headers
    "curl -skI https://sat.center/api/v1/health | head -20",
    # check if API returns 502 sometimes
    "for i in 1 2 3 4 5; do curl -sk -o /dev/null -w '%{http_code} ' https://sat.center/api/v1/health; done; echo",
    # laravel route list for backup on server? can't without ssh
    # Try password auth endpoint shape
    "curl -sk -X POST https://sat.center/api/v1/auth/password-login -H 'Content-Type: application/json' -d '{\"phone\":\"09120000001\",\"password\":\"wrong\"}' | head -c 300",
    # frontend index references API?
    "curl -sk https://sat.center/ | grep -oE 'VITE_API|/api/v1|localhost' | head -5 || echo NO_API_REF",
    "curl -sk https://sat.center/assets/index-*.js 2>/dev/null | head -c 1 || ls /dev/null",
    "JS=$(curl -sk https://sat.center/ | grep -oE '/assets/index-[^\"]+\\.js' | head -1); echo JS=$JS; curl -sk \"https://sat.center$JS\" | grep -oE 'localhost:8000|/api/v1|VITE_API' | sort -u | head -10",
]
for cmd in cmds:
    print("===", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=90)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err[:400])
c.close()
