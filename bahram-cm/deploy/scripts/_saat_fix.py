#!/usr/bin/env python3
"""Diagnose and fix Saat on 185.130.50.24."""
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
SAAT_ENV = ROOT / "saat" / "deploy" / "deploy.env"
BAHRAM_ENV = Path(__file__).resolve().parents[1] / "deploy.env"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def saat_env() -> dict[str, str]:
    env = load_env(SAAT_ENV)
    if not env.get("DEPLOY_PASSWORD"):
        raise SystemExit(f"Missing saat/deploy/deploy.env — copy from deploy.env.example")
    return env


def connect() -> paramiko.SSHClient:
    env = saat_env()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        env["DEPLOY_HOST"],
        int(env.get("DEPLOY_PORT", "22")),
        env["DEPLOY_USER"],
        env["DEPLOY_PASSWORD"],
        timeout=90,
    )
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 120) -> str:
    print("===", cmd[:110])
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out[:4000])
    if err.strip():
        print("ERR:", err[:800])
    return out


def main() -> int:
    action = sys.argv[1] if len(sys.argv) > 1 else "diag"
    c = connect()
    print("Connected to Saat server")

    if action == "diag":
        for cmd in [
            "hostname && uptime",
            "ls -la /var/www/saat /var/www/mini-call-center 2>&1 | head -15",
            "cd /var/www/mini-call-center 2>/dev/null && git rev-parse --short HEAD && git log -1 --oneline || cd /var/www/saat && git rev-parse --short HEAD 2>/dev/null",
            "supervisorctl status 2>/dev/null | head -15",
            "systemctl is-active nginx php8.4-fpm mysql redis-server",
            "curl -sf http://127.0.0.1/api/v1/health -H 'Host: sat.center' || curl -sk https://127.0.0.1/api/v1/health -H 'Host: sat.center'",
            "tail -50 /var/www/saat/backend/storage/logs/laravel.log 2>/dev/null | tail -30",
            "grep -E '^(APP_ENV|APP_DEBUG|QUEUE_CONNECTION|DEV_LOGIN|DEMO_OTP|TELEGRAM_BOT)' /var/www/saat/backend/.env | sed 's/TOKEN=.*/TOKEN=***/' | head -10",
            "php-fpm8.4 -i 2>/dev/null | grep -E 'upload_max_filesize|post_max_size' | head -2",
            "curl -sk -o /dev/null -w 'admin_backup:%{http_code}\\n' http://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'",
        ]:
            run(c, cmd)
        c.close()
        return 0

    if action == "deploy":
        script = """#!/bin/bash
set -euo pipefail
LOG=/tmp/saat-fix.log
exec > >(tee "$LOG") 2>&1
echo "=== SAAT FIX $(date -Is) ==="
if [[ -d /var/www/mini-call-center/.git ]]; then
  cd /var/www/mini-call-center
elif [[ -d /var/www/saat/.git ]]; then
  cd /var/www/saat
else
  echo NO_GIT; exit 1
fi
git fetch origin main
git reset --hard origin/main
echo GIT_HEAD=$(git rev-parse --short HEAD)
cd /var/www/saat
bash deploy/scripts/deploy.sh all
echo "=== POST ==="
supervisorctl status saat-queue:* 2>/dev/null || true
curl -sf http://127.0.0.1/api/v1/health -H 'Host: sat.center'
echo
curl -sf http://127.0.0.1/version.json -H 'Host: sat.center' | head -c 250
echo
curl -sk -o /dev/null -w 'admin_backup:%{http_code}\\n' http://127.0.0.1/api/v1/admin/backup -H 'Host: sat.center' -H 'Accept: application/json'
echo DONE
"""
        sftp = c.open_sftp()
        with sftp.file("/tmp/saat-fix.sh", "w") as f:
            f.write(script)
        sftp.chmod("/tmp/saat-fix.sh", 0o755)
        sftp.close()
        c.exec_command("nohup bash /tmp/saat-fix.sh > /tmp/saat-fix.nohup 2>&1 &", timeout=15)
        print("Deploy started...")
        for i in range(60):
            time.sleep(15)
            _, o, _ = c.exec_command("tail -3 /tmp/saat-fix.log 2>/dev/null; test -f /tmp/saat-fix.log && grep -q '^DONE$' /tmp/saat-fix.log && echo FIN || echo RUN", timeout=30)
            lines = o.read().decode().strip().split("\n")
            print(f"[{i*15:4d}s]", lines[-1] if lines else "?")
            if lines and lines[-1] == "FIN":
                _, o, _ = c.exec_command("tail -60 /tmp/saat-fix.log", timeout=60)
                print(o.read().decode("utf-8", errors="replace"))
                break
        else:
            run(c, "tail -40 /tmp/saat-fix.log")
        c.close()
        return 0

    c.close()
    print("Unknown action:", action)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
