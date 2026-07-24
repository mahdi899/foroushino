#!/usr/bin/env python3
"""Upload Saat cache-fix files and redeploy on production."""
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

# Local → remote paths (relative to REPO)
FILES = [
    "backend/app/Http/Middleware/PreventApiCaching.php",
    "backend/bootstrap/app.php",
    "backend/app/Services/Cloudflare/CloudflareIntegrationService.php",
    "backend/app/Services/Cloudflare/CloudflareCacheService.php",
    "backend/app/Http/Controllers/Api/V1/Admin/CloudflareController.php",
    "backend/app/Http/Controllers/Api/V1/MeAvatarController.php",
    "backend/app/Services/Admin/AdminDirectoryCache.php",
    "backend/app/Support/PublicMediaUrl.php",
    "backend/app/Http/Resources/V1/UserResource.php",
    "backend/app/Http/Resources/V1/UserAdminResource.php",
    "backend/routes/api/admin.php",
    "backend/config/saat.php",
    "frontend/src/services/adminDataCache.ts",
    "frontend/src/services/teamLive.ts",
    "frontend/src/services/cloudflare.ts",
    "frontend/src/features/admin/CloudflareSettingsSection.tsx",
    "frontend/src/features/admin/AdminSettingsScreen.tsx",
    "frontend/src/features/profile/ProfileAvatarPicker.tsx",
]


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 1800) -> int:
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


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST} ...")
    client.connect(HOST, 22, USER, PASSWORD, timeout=120, banner_timeout=120, auth_timeout=120)

    sftp = client.open_sftp()
    try:
        for rel in FILES:
            local = REPO / rel
            remote = f"{APP_DIR}/{rel.replace(chr(92), '/')}"
            if not local.is_file():
                print(f"SKIP missing local: {local}")
                continue
            remote_dir = str(Path(remote).parent).replace(chr(92), "/")
            try:
                sftp.stat(remote_dir)
            except OSError:
                # mkdir -p via ssh
                run(client, f"mkdir -p '{remote_dir}'")
            print(f"Upload {rel}")
            sftp.put(str(local), remote)
    finally:
        sftp.close()

    commands = [
        f"cd {APP_DIR}/backend && composer dump-autoload -o 2>/dev/null || true",
        f"cd {APP_DIR}/backend && php artisan optimize:clear",
        f"cd {APP_DIR}/backend && php artisan route:list --path=cloudflare 2>/dev/null | head -8",
        f"cd {APP_DIR} && bash deploy/scripts/deploy.sh frontend",
    ]

    try:
        for cmd in commands:
            code = run(client, cmd)
            if code != 0 and "deploy.sh frontend" in cmd:
                print("Frontend deploy had errors — check output above")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
