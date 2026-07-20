#!/usr/bin/env python3
"""Upload family performance fixes and rebuild on production."""
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
DEPLOY_ENV = Path(__file__).resolve().parents[1] / "deploy.env"
APP = "/var/www/bahram-cm"
FLUTTER = "/var/www/foroushino/bahram-family-manager"

UPLOADS = [
    (ROOT / "bahram-cm/backend/app/Services/Family/FeedService.php", f"{APP}/backend/app/Services/Family/FeedService.php"),
    (ROOT / "bahram-cm/backend/config/family.php", f"{APP}/backend/config/family.php"),
    (ROOT / "bahram-cm/frontend/components/family/FeedView.tsx", f"{APP}/frontend/components/family/FeedView.tsx"),
    (ROOT / "bahram-cm/frontend/lib/family/swr.ts", f"{APP}/frontend/lib/family/swr.ts"),
    (ROOT / "bahram-cm/frontend/app/family/page.tsx", f"{APP}/frontend/app/family/page.tsx"),
    (ROOT / "bahram-cm/deploy/nginx/rostami-club.conf", "/etc/nginx/sites-available/rostami-club.conf"),
    (ROOT / "bahram-family-manager/scripts/build-web-production.sh", f"{FLUTTER}/scripts/build-web-production.sh"),
]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in DEPLOY_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def main() -> int:
    env = load_env()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        env["DEPLOY_HOST"],
        int(env.get("DEPLOY_PORT", "22")),
        env["DEPLOY_USER"],
        env["DEPLOY_PASSWORD"],
        timeout=120,
    )

    sftp = client.open_sftp()
    for local, remote in UPLOADS:
        print(f"upload {local.name} -> {remote}")
        sftp.put(str(local), remote)
    sftp.close()

    remote_script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/family-perf-deploy.log
exec > >(tee "$LOG") 2>&1
echo "=== FAMILY PERF DEPLOY $(date -Is) ==="
APP={APP}
FLUTTER={FLUTTER}

echo "==> nginx"
nginx -t && systemctl reload nginx

echo "==> backend cache"
cd $APP/backend
grep -E '^CACHE_(STORE|DRIVER)=' .env || true
php artisan config:cache
php -r "if (function_exists('opcache_reset')) opcache_reset();"

echo "==> frontend build"
cd $APP/frontend
export NODE_OPTIONS="${{NODE_OPTIONS:---max-old-space-size=3072}}"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
npm run build
test -f .next/BUILD_ID
pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env

echo "==> flutter admin rebuild"
chmod +x $FLUTTER/scripts/build-web-production.sh
API_BASE_URL=https://rostami.club/api/v1 bash $FLUTTER/scripts/build-web-production.sh
pm2 restart family-manager-web
pm2 save

echo "==> health"
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK
curl -sf -o /dev/null -w "next:%{{http_code}}\\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "club:%{{http_code}}\\n" -H "Host: rostami.club" http://127.0.0.1/
curl -sf -o /dev/null -w "club_api:%{{http_code}}\\n" -H "Host: rostami.club" http://127.0.0.1/api/v1/family/branding
curl -sf -o /dev/null -w "admin:%{{http_code}}\\n" -H "Host: rostami.club" http://127.0.0.1/admin/
echo DONE
"""

    sftp = client.open_sftp()
    with sftp.file("/tmp/family-perf-deploy.sh", "w") as handle:
        handle.write(remote_script)
    sftp.chmod("/tmp/family-perf-deploy.sh", 0o755)
    sftp.close()

    client.exec_command(
        "rm -f /tmp/family-perf-deploy.done; "
        "nohup bash /tmp/family-perf-deploy.sh; "
        "echo $? > /tmp/family-perf-deploy.done",
        timeout=30,
    )
    print("Deploy started on", env["DEPLOY_HOST"])

    for i in range(90):
        time.sleep(20)
        _, stdout, _ = client.exec_command(
            "test -f /tmp/family-perf-deploy.done && echo FIN || echo RUN; "
            "tail -2 /tmp/family-perf-deploy.log 2>/dev/null",
            timeout=60,
        )
        lines = stdout.read().decode().strip().split("\n")
        status = lines[0] if lines else "?"
        tail = lines[-1] if len(lines) > 1 else ""
        print(f"[{i * 20:4d}s] {status} | {tail[-120:]}")
        if status == "FIN":
            _, stdout, _ = client.exec_command(
                "cat /tmp/family-perf-deploy.done; tail -60 /tmp/family-perf-deploy.log",
                timeout=120,
            )
            print(stdout.read().decode("utf-8", errors="replace"))
            client.close()
            return 0

    print("TIMEOUT")
    _, stdout, _ = client.exec_command("tail -40 /tmp/family-perf-deploy.log", timeout=60)
    print(stdout.read().decode("utf-8", errors="replace"))
    client.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
