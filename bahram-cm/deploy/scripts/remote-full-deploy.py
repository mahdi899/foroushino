#!/usr/bin/env python3
"""Upload media/dev fixes and run full deploy on origin. Usage: python deploy/scripts/remote-full-deploy.py"""
from __future__ import annotations

import io
import os
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
HOST = (os.environ.get("DEPLOY_HOST") or "").strip()
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASSWORD", "")
if not HOST or not PASS:
    # Prefer deploy/deploy.env via env vars — never hardcode production IPs/passwords.
    env_path = ROOT / "deploy" / "deploy.env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key, value = key.strip(), value.strip()
            if key == "DEPLOY_HOST" and not HOST:
                HOST = value
            elif key == "DEPLOY_USER" and USER == "root":
                USER = value or USER
            elif key == "DEPLOY_PASSWORD" and not PASS:
                PASS = value
    if not HOST or not PASS:
        raise SystemExit("Set DEPLOY_HOST and DEPLOY_PASSWORD in deploy/deploy.env (gitignored).")

UPLOADS = [
    "deploy/scripts/start-dev-server.sh",
    "deploy/scripts/start-prod-server.sh",
    "deploy/scripts/fix-media-urls.sh",
    "deploy/pm2/ecosystem.dev.config.cjs",
    "backend/app/Support/FamilyMediaUrl.php",
    "backend/app/Support/FamilyMediaStorage.php",
    "backend/app/Services/Media/LocalMediaCopyPurger.php",
    "backend/app/Console/Commands/PurgeLocalMediaCopies.php",
    "backend/app/Services/Family/FamilyMediaSiteSync.php",
    "backend/app/Jobs/Family/TransferFamilyMediaToFtpJob.php",
    "backend/app/Jobs/Family/ProcessFamilyVideoJob.php",
    "backend/app/Services/Family/FamilyMediaLibraryRegistry.php",
    "backend/routes/console.php",
    "frontend/lib/mediaUrl.ts",
]

REMOTE = r'''#!/bin/bash
set -euo pipefail
APP=/var/www/bahram-cm
ENV=$APP/backend/.env
FE=$APP/frontend/.env.local
LOG=/tmp/bahram-full-deploy.log
exec > >(tee "$LOG") 2>&1
echo "=== FULL DEPLOY $(date -Is) ==="
set_env(){ k=$1; v=$2; grep -q "^${k}=" "$ENV" 2>/dev/null && sed -i "s|^${k}=.*|${k}=${v}|" "$ENV" || echo "${k}=${v}" >> "$ENV"; }
set_env APP_ENV local
set_env APP_DEBUG true
set_env FAMILY_MEDIA_DISK family_media_ftp
set_env MEDIA_DISK site_media_ftp
set_env FAMILY_MEDIA_CDN_URL https://cdn.rostami.app
set_env MEDIA_URL https://cdn.rostami.app
mysql bahram_backend -e "UPDATE family_media SET disk='family_media_ftp' WHERE disk IN ('public','local') AND storage_path IS NOT NULL AND storage_path != '';"
cd $APP/backend && composer install --optimize-autoloader --no-interaction --prefer-dist
php artisan config:clear && php artisan route:clear && php artisan view:clear
php artisan storage:link 2>/dev/null || true
php artisan media:purge-local-copies --limit=500 || true
touch "$FE"
grep -q '^NEXT_PUBLIC_MEDIA_URL=' "$FE" && sed -i 's|^NEXT_PUBLIC_MEDIA_URL=.*|NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app|' "$FE" || echo 'NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app' >> "$FE"
chmod +x $APP/deploy/scripts/*.sh 2>/dev/null || true
pm2 delete bahram-frontend 2>/dev/null || true
pkill -f 'next start' 2>/dev/null || true
sleep 2
cd $APP/frontend && { [ -d node_modules ] || npm install --prefer-offline --no-audit; }
pm2 start $APP/deploy/pm2/ecosystem.dev.config.cjs --update-env && pm2 save
sleep 12
pm2 list
curl -sf -o /dev/null -w "next: %{http_code}\n" --max-time 10 http://127.0.0.1:3000/ || true
curl -sk --max-time 10 https://rostami.app/api/v1/family/branding | head -c 400
echo
echo "=== DONE $(date -Is) ==="
'''


def load_password() -> str:
    if PASS:
        return PASS
    env_file = ROOT / "deploy" / "deploy.env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("DEPLOY_PASSWORD="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("Set DEPLOY_PASSWORD or deploy/deploy.env")


def connect(pwd: str, retries: int = 15) -> paramiko.SSHClient:
    for i in range(retries):
        try:
            c = paramiko.SSHClient()
            c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            c.connect(HOST, 22, USER, pwd, timeout=45, banner_timeout=90, auth_timeout=90)
            print(f"SSH OK (attempt {i + 1})")
            return c
        except Exception as exc:
            print(f"attempt {i + 1}/{retries}: {exc}")
            time.sleep(12)
    raise SystemExit("SSH unavailable — reboot server from hosting panel")


def main() -> None:
    pwd = load_password()
    c = connect(pwd)
    sftp = c.open_sftp()
    for rel in UPLOADS:
        local = ROOT / rel
        if local.exists():
            remote = f"/var/www/bahram-cm/{rel.replace(chr(92), '/')}"
            print(f"upload {rel}")
            sftp.put(str(local), remote)
    with sftp.file("/tmp/bahram_full_deploy.sh", "w") as fh:
        fh.write(REMOTE)
    sftp.chmod("/tmp/bahram_full_deploy.sh", 0o755)
    sftp.close()

    print("running deploy…")
    _, stdout, stderr = c.exec_command("bash /tmp/bahram_full_deploy.sh", timeout=900)
    print(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip():
        print("STDERR:", err[:1000])
    c.close()


if __name__ == "__main__":
    main()
