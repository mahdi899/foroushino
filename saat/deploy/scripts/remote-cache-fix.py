#!/usr/bin/env python3
"""Hotfix Saat cache (nginx + optional Cloudflare purge) on production server."""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"
APP_DIR = "/var/www/saat"
NGINX_PATHS = [
    "/etc/nginx/sites-available/sat-center.conf",
    "/etc/nginx/sites-enabled/sat-center.conf",
]
LOCAL_NGINX = Path(__file__).resolve().parents[1] / "nginx" / "sat-center.conf"


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 600) -> int:
    print(f"\n=== {cmd} ===")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out, end="" if out.endswith("\n") else "\n")
    if err.strip():
        print("STDERR:", err, end="" if err.endswith("\n") else "\n")
    return code


def upload_sftp(client: paramiko.SSHClient, local: Path, remote: str) -> None:
    sftp = client.open_sftp()
    try:
        print(f"Upload {local.name} -> {remote}")
        sftp.put(str(local), remote)
    finally:
        sftp.close()


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    if not LOCAL_NGINX.is_file():
        print(f"Missing {LOCAL_NGINX}", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST} ...")
    client.connect(HOST, 22, USER, PASSWORD, timeout=120, banner_timeout=120, auth_timeout=120)

    try:
        for remote in NGINX_PATHS:
            upload_sftp(client, LOCAL_NGINX, remote)

        commands = [
            f"cd {APP_DIR} && git pull --ff-only 2>/dev/null || true",
            f"cd {APP_DIR}/backend && php artisan config:clear && php artisan cache:clear",
            "nginx -t",
            "systemctl reload nginx",
            'curl -sI https://sat.center/version.json | grep -iE "cache-control|cdn-cache" || true',
            'curl -sI https://sat.center/api/v1/health 2>/dev/null | grep -iE "cache-control|cdn-cache|HTTP" | head -5 || true',
            f"cd {APP_DIR} && bash deploy/scripts/deploy.sh frontend 2>/dev/null || true",
        ]

        for cmd in commands:
            if run(client, cmd) != 0 and "nginx -t" in cmd:
                return 1

        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
