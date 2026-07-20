#!/usr/bin/env python3
"""Deploy media upload fix to production."""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = Path(__file__).resolve().parents[1] / "deploy.env"
APP = "/var/www/bahram-cm"
FLUTTER = "/var/www/foroushino/bahram-family-manager"

UPLOADS = [
    (ROOT / "bahram-cm/backend/app/Http/Controllers/Api/V1/FamilyManager/MediaController.php", f"{APP}/backend/app/Http/Controllers/Api/V1/FamilyManager/MediaController.php"),
    (ROOT / "bahram-cm/deploy/nginx/rostami-club.conf", "/etc/nginx/sites-available/rostami-club.conf"),
    (ROOT / "bahram-family-manager/lib/services/family_manager_service.dart", f"{FLUTTER}/lib/services/family_manager_service.dart"),
]

env = {}
for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.strip().startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
for local, remote in UPLOADS:
    print("upload", local.name)
    sftp.put(str(local), remote)
sftp.close()

remote = f"""#!/bin/bash
set -euo pipefail
APP={APP}
FLUTTER={FLUTTER}
nginx -t && systemctl reload nginx
cd $APP/backend && php artisan route:cache
cd $FLUTTER && ../.tools/flutter/bin/flutter build web --release --base-href=/admin/ --dart-define=API_BASE_URL=https://rostami.club/api/v1
pm2 restart family-manager-web
# verify upload with optimize_images=true
OUT=$(cd $APP/backend && php artisan tinker --execute="echo \\\\App\\\\Models\\\\User::query()->whereHas('roles')->first()->createToken('t')->plainTextToken;" 2>/dev/null | tail -1)
printf '\\x89PNG\\r\\n\\x1a\\n' > /tmp/tiny.png
echo TEST_TRUE:
curl -sk -X POST "https://127.0.0.1/api/v1/family-manager/media" -H "Host: rostami.club" -H "Authorization: Bearer $OUT" -H "Accept: application/json" -F "type=image" -F "file=@/tmp/tiny.png;type=image/png" -F "optimize_images=true"
echo
echo NGINX_LOC:
nginx -T 2>/dev/null | grep -A1 'family-manager/media' | head -4
echo DONE
"""
sftp = c.open_sftp()
with sftp.file("/tmp/fix-upload.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/fix-upload.sh", 0o755)
sftp.close()
_, out, err = c.exec_command("bash /tmp/fix-upload.sh", timeout=900)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e[-2000:])
c.close()
