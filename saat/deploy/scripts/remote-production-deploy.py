#!/usr/bin/env python3
"""Deploy latest local Saat cache-fix commit to production (SFTP + rebuild)."""
from __future__ import annotations

import io
import subprocess
import sys
from pathlib import Path

import paramiko

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"
APP_DIR = "/var/www/saat"
REPO = Path(__file__).resolve().parents[2]

FILES = [
    "backend/app/Console/Commands/BackupWeeklyFullCommand.php",
    "backend/app/Http/Controllers/Api/V1/Admin/BackupController.php",
    "backend/app/Models/DatabaseBackupSetting.php",
    "backend/app/Services/BackupService.php",
    "backend/config/saat.php",
    "backend/database/migrations/2026_07_23_120000_add_weekly_backup_fields_to_database_backup_settings.php",
    "backend/routes/api/admin.php",
    "backend/routes/console.php",
    "backend/tests/Feature/BackupSettingsTest.php",
    "deploy/scripts/backup.sh",
    "deploy/scripts/deploy.sh",
    "frontend/src/lib/backup.ts",
    "frontend/src/features/admin/BackupSettingsSection.tsx",
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

  # Show local commit being deployed
    try:
        sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=REPO, text=True).strip()
        print(f"Deploying local commit {sha}")
    except Exception:
        pass

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
                print(f"SKIP missing: {local}")
                continue
            remote_dir = str(Path(remote).parent).replace(chr(92), "/")
            run(client, f"mkdir -p '{remote_dir}'")
            print(f"Upload {rel}")
            sftp.put(str(local), remote)
    finally:
        sftp.close()

    nginx_local = REPO / "deploy/nginx/sat-center.conf"
    for remote_nginx in (
        "/etc/nginx/sites-available/sat-center.conf",
        "/etc/nginx/sites-enabled/sat-center.conf",
    ):
        sftp = client.open_sftp()
        try:
            print(f"Upload nginx -> {remote_nginx}")
            sftp.put(str(nginx_local), remote_nginx)
        finally:
            sftp.close()

    commands = [
        "ln -sfn /etc/letsencrypt/live/sat.center-0001 /etc/letsencrypt/live/sat.center",
        f"chmod +x {APP_DIR}/deploy/scripts/backup.sh",
        f"cd {APP_DIR}/backend && composer dump-autoload -o",
        f"cd {APP_DIR}/backend && php artisan migrate --force",
        f"cd {APP_DIR}/backend && php artisan optimize:clear",
        f"cd {APP_DIR}/backend && php artisan config:cache",
        f"cd {APP_DIR}/backend && php artisan route:cache",
        "(crontab -l 2>/dev/null | grep -v saat-backup-cron || true; echo '0 3 * * * /var/www/saat/deploy/scripts/backup.sh # saat-backup-cron'; echo '* * * * * cd /var/www/saat/backend && php artisan schedule:run >> /var/log/saat-schedule.log 2>&1 # saat-backup-cron') | crontab -",
        "nginx -t",
        "systemctl reload nginx",
        f"cd {APP_DIR}/frontend && npm ci --include=dev",
        f"cd {APP_DIR}/frontend && npm run build",
    ]

    try:
        for cmd in commands:
            code = run(client, cmd)
            if code != 0 and "nginx -t" in cmd:
                return 1
        print("\nDeploy complete — https://sat.center")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
