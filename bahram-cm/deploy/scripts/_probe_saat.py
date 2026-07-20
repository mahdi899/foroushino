#!/usr/bin/env python3
from pathlib import Path
import paramiko

ENV_FILE = Path(__file__).resolve().parents[1] / "deploy.env"
env = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

hosts = ["185.130.50.129", "185.130.50.24"]
user = env.get("DEPLOY_USER", "root")
password = env.get("DEPLOY_PASSWORD", "")

for host in hosts:
    print(f"\n===== {host} =====")
    try:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(host, 22, user, password, timeout=15)
        cmds = [
            "hostname -I; ls -la /var/www/saat 2>/dev/null | head -3 || echo NO_SAAT",
            "ls -la /var/www/mini-call-center 2>/dev/null | head -3 || echo NO_GIT",
            "curl -sf http://127.0.0.1/api/v1/health -H 'Host: sat.center' || echo HEALTH_FAIL",
            "supervisorctl status saat-queue:* 2>/dev/null | head -5 || echo NO_QUEUE",
            "tail -30 /var/www/saat/backend/storage/logs/laravel.log 2>/dev/null || echo NO_LOG",
        ]
        for cmd in cmds:
            print("---", cmd[:60])
            _, o, e = c.exec_command(cmd, timeout=30)
            out = o.read().decode("utf-8", errors="replace")
            err = e.read().decode("utf-8", errors="replace")
            print(out or err)
        c.close()
    except Exception as ex:
        print("FAIL:", ex)
