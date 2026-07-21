#!/usr/bin/env python3
"""Full production rebuild: git pull + deploy.sh + flutter family admin."""
from __future__ import annotations

import time
from pathlib import Path

from _deploy_common import configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()

REMOTE = r"""#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-full-rebuild.log
exec > >(tee -a "$LOG") 2>&1
echo "=== FULL REBUILD $(date -Is) ==="

GIT_ROOT=/var/www/foroushino
APP=/var/www/bahram-cm

# preserve env
cp -a "$APP/backend/.env" /root/pre-rebuild-backend.env
cp -a "$APP/frontend/.env.local" /root/pre-rebuild-frontend.env.local 2>/dev/null || true

cd "$GIT_ROOT"
git fetch origin main
git reset --hard origin/main
echo HEAD=$(git rev-parse --short HEAD)

# ensure env still present
if [ ! -f "$APP/backend/.env" ]; then
  cp -a /root/pre-rebuild-backend.env "$APP/backend/.env"
fi
if [ ! -f "$APP/frontend/.env.local" ] && [ -f /root/pre-rebuild-frontend.env.local ]; then
  cp -a /root/pre-rebuild-frontend.env.local "$APP/frontend/.env.local"
fi

# If local VideoBlock fix was uploaded before push, keep latest from git (origin has commit after push)

cd "$APP"
bash deploy/scripts/deploy.sh

# Flutter family manager (best-effort — pub.dev may fail)
if [ -x /var/www/foroushino/bahram-family-manager/scripts/build-web-production.sh ]; then
  echo "==> Flutter rebuild"
  bash /var/www/foroushino/bahram-family-manager/scripts/build-web-production.sh || echo "WARN: flutter build skipped/failed"
  pm2 reload family-manager-web --update-env || true
fi

supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null || true

echo "=== HEALTH ==="
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK || echo LARAVEL_FAIL
curl -sf -o /dev/null -w "NEXT:%{http_code}\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "APP:%{http_code}\n" --max-time 25 https://rostami.app/
curl -sf -o /dev/null -w "CLUB:%{http_code}\n" --max-time 25 https://rostami.club/
curl -sf -o /dev/null -w "ADMIN:%{http_code}\n" --max-time 25 https://rostami.club/admin/
curl -sf -o /dev/null -w "FEED:%{http_code}\n" --max-time 20 https://rostami.club/api/v1/family/feed
pm2 list
echo REBUILD_OK
"""


def main() -> int:
    env = load_deploy_env()
    client = connect(env, timeout=90)

    # Upload video fix first in case commit not pushed yet
    root = Path(__file__).resolve().parents[2]
    local_video = root / "frontend/components/family/blocks/VideoBlock.tsx"
    if local_video.exists():
        upload_files(client, [(local_video, "frontend/components/family/blocks/VideoBlock.tsx")], env)

    sftp = client.open_sftp()
    with sftp.file("/tmp/bahram-full-rebuild.sh", "w") as handle:
        handle.write(REMOTE)
    sftp.chmod("/tmp/bahram-full-rebuild.sh", 0o755)
    sftp.close()

    client.exec_command(
        "rm -f /tmp/bahram-full-rebuild.done /tmp/bahram-full-rebuild.log; "
        "nohup bash -c 'bash /tmp/bahram-full-rebuild.sh; echo $? > /tmp/bahram-full-rebuild.done' "
        ">/tmp/bahram-full-rebuild-outer.log 2>&1 &",
        timeout=30,
    )
    print("Full rebuild started on", env["DEPLOY_HOST"])

    deadline = time.time() + 60 * 45
    last_size = -1
    while time.time() < deadline:
        time.sleep(25)
        stdin, stdout, stderr = client.exec_command(
            "test -f /tmp/bahram-full-rebuild.done && echo DONE || echo RUNNING; "
            "wc -c < /tmp/bahram-full-rebuild.log 2>/dev/null || echo 0; "
            "tail -n 20 /tmp/bahram-full-rebuild.log 2>/dev/null || true",
            timeout=60,
        )
        out = stdout.read().decode("utf-8", errors="replace")
        lines = out.strip().splitlines()
        status = lines[0] if lines else "?"
        try:
            size = int(lines[1]) if len(lines) > 1 else 0
        except ValueError:
            size = 0
        if size != last_size or status == "DONE":
            print("---", status, "bytes=", size, "---")
            print("\n".join(lines[2:][-18:]))
            last_size = size
        if status == "DONE":
            stdin, stdout, stderr = client.exec_command(
                "cat /tmp/bahram-full-rebuild.done; "
                "grep -E 'REBUILD_OK|FAIL|error|Error|DONE' /tmp/bahram-full-rebuild.log | tail -20",
                timeout=60,
            )
            print(stdout.read().decode("utf-8", errors="replace"))
            stdin, stdout, stderr = client.exec_command("cat /tmp/bahram-full-rebuild.done", timeout=30)
            raw = stdout.read().decode().strip()
            client.close()
            try:
                return int(raw)
            except ValueError:
                return 1

    print("TIMEOUT")
    client.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
