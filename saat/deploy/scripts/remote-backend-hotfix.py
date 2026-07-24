#!/usr/bin/env python3
"""Upload Saat cache-fix backend files to production."""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"
APP_DIR = "/var/www/saat"
REPO = Path(__file__).resolve().parents[2]

FILES = [
    "backend/app/Http/Middleware/PreventApiCaching.php",
    "backend/bootstrap/app.php",
    "backend/app/Support/PublicMediaUrl.php",
    "backend/app/Http/Controllers/Api/V1/MeAvatarController.php",
    "backend/app/Http/Resources/V1/UserResource.php",
    "backend/app/Http/Resources/V1/UserAdminResource.php",
    "backend/app/Services/Admin/AdminDirectoryCache.php",
    "backend/app/Services/Cloudflare/CloudflareIntegrationService.php",
    "backend/app/Services/Cloudflare/CloudflareCacheService.php",
    "backend/app/Http/Controllers/Api/V1/Admin/CloudflareController.php",
    "backend/routes/api/admin.php",
    "backend/config/saat.php",
]


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST} ...")
    client.connect(HOST, 22, USER, PASSWORD, timeout=120)

    sftp = client.open_sftp()
    try:
        for rel in FILES:
            local = REPO / rel.replace("/", "\\") if sys.platform == "win32" else REPO / rel
            remote = f"{APP_DIR}/{rel.replace(chr(92), '/')}"
            remote_dir = "/".join(remote.split("/")[:-1])
            try:
                sftp.stat(remote_dir)
            except OSError:
                # mkdir -p via ssh
                client.exec_command(f"mkdir -p {remote_dir}")
            print(f"Upload {rel}")
            sftp.put(str(local), remote)
    finally:
        sftp.close()

    cmds = [
        f"cd {APP_DIR}/backend && php artisan route:clear && php artisan config:clear && php artisan cache:clear",
        f"cd {APP_DIR}/backend && php artisan route:list --path=cloudflare",
        "curl -skI -H 'Host: sat.center' https://127.0.0.1/storage/avatars/users/1.jpg | grep -iE 'cache-control|cdn-cache|expires' || true",
    ]
    for cmd in cmds:
        print(f"\n=== {cmd} ===")
        _, o, e = client.exec_command(cmd, timeout=120)
        print(o.read().decode())
        err = e.read().decode()
        if err.strip():
            print("STDERR:", err)

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
