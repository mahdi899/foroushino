#!/usr/bin/env python3
"""SSH to Saat server and diagnose/fix."""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ENV_FILE = Path(__file__).resolve().parents[1] / "deploy.env"
env: dict[str, str] = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

SAAT = "185.130.50.24"
USER = env.get("DEPLOY_USER", "root")
PASS = env["DEPLOY_PASSWORD"]

def ssh(host: str) -> paramiko.SSHClient:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, 22, USER, PASS, timeout=90)
    return c

def run(c: paramiko.SSHClient, cmd: str, timeout: int = 120) -> str:
    print("===", cmd[:100])
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out)
    if err.strip():
        print("ERR:", err)
    return out

try:
    client = ssh(SAAT)
    print("OK direct SSH to", SAAT)
except Exception as exc:
    print("Direct SSH failed:", exc)
    print("Trying hop via bahram...")
    bahram = ssh(env["DEPLOY_HOST"])
    hop = (
        f"sshpass -p '{PASS}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 "
        f"{USER}@{SAAT} 'hostname && ls /var/www/saat 2>&1 | head -5'"
    )
    run(bahram, f"which sshpass || apt-get install -qq -y sshpass 2>/dev/null; {hop}", 180)
    bahram.close()
    sys.exit(0)

cmds = [
    "hostname && uptime",
    "ls -la /var/www/saat /var/www/mini-call-center 2>&1 | head -20",
    "cd /var/www/mini-call-center 2>/dev/null && git rev-parse --short HEAD || cd /var/www/saat && git rev-parse --short HEAD 2>/dev/null || echo NO_GIT",
    "supervisorctl status 2>/dev/null | head -20 || systemctl status supervisor --no-pager 2>&1 | head -5",
    "supervisorctl status saat-queue:* 2>/dev/null || echo NO_SAAT_QUEUE",
    "systemctl is-active nginx php8.4-fpm mysql redis-server 2>/dev/null",
    "curl -sf http://127.0.0.1/api/v1/health -H 'Host: sat.center' || curl -sf https://127.0.0.1/api/v1/health -H 'Host: sat.center' -k",
    "tail -40 /var/www/saat/backend/storage/logs/laravel.log 2>/dev/null || echo NO_LOG",
    "grep -E '^(APP_ENV|APP_DEBUG|QUEUE_CONNECTION|TELEGRAM|DB_)' /var/www/saat/backend/.env 2>/dev/null | sed 's/PASSWORD=.*/PASSWORD=***/' | head -15",
    "php -r 'echo \"upload_max=\".ini_get(\"upload_max_filesize\").\" post_max=\".ini_get(\"post_max_size\").PHP_EOL;' 2>/dev/null",
    "nginx -t 2>&1",
    "ls -la /var/www/saat/backend/bootstrap/cache/*.php 2>/dev/null | head -5",
]
for cmd in cmds:
    run(client, cmd)

client.close()
