#!/usr/bin/env python3
"""Upload git bundle and run production deploy on Iran server."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
DEPLOY_ENV = ROOT / "bahram-cm" / "deploy" / "deploy.env"
BUNDLE = ROOT / ".tmp" / "foroushino-deploy.bundle"

REMOTE_DEPLOY = r"""
set -euo pipefail
echo "=== PRE-DEPLOY $(date -Is) ==="
cd /var/www/foroushino
echo "server_before=$(git rev-parse --short HEAD)"
git checkout -- bahram-cm/frontend/lib/pwa/build-info.generated.ts bahram-cm/frontend/public/version.json 2>/dev/null || true
git checkout -- bahram-cm/backend/storage/app/public/media 2>/dev/null || true
git checkout -- bahram-cm/backend/app/Services/TelegramHostAccountSnapshotService.php \
  bahram-cm/backend/app/Services/TelegramHostRegistrationService.php \
  telegram/public/webhook.php telegram/src/Account/AccountCache.php \
  telegram/src/Services/ReferenceChannelFlow.php 2>/dev/null || true
echo "==> pull from local bundle"
ls -lh /tmp/foroushino-deploy.bundle
git pull --ff-only /tmp/foroushino-deploy.bundle main
echo "server_after=$(git rev-parse --short HEAD)"
rm -f /tmp/foroushino-deploy.bundle
echo "==> deploy.sh"
bash /var/www/bahram-cm/deploy/scripts/deploy.sh
cd /var/www/bahram-cm/backend
php artisan storage:link 2>/dev/null || true
php artisan media:sync --import 2>/dev/null || true
php artisan media:sync --export 2>/dev/null || true
echo "==> smoke"
curl -sf http://127.0.0.1:8010/up && echo " Laravel OK"
curl -sf -o /dev/null -w "Next.js: %{http_code}\n" http://127.0.0.1:3000/
echo "=== DEPLOY DONE $(date -Is) ==="
"""


def load_deploy_env() -> dict[str, str]:
    out: dict[str, str] = {}
    for line in DEPLOY_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def stream_exec(client: paramiko.SSHClient, command: str) -> int:
    transport = client.get_transport()
    channel = transport.open_session()
    channel.exec_command(command)
    while True:
        if channel.recv_ready():
            chunk = channel.recv(4096)
            if chunk:
                sys.stdout.write(chunk.decode("utf-8", errors="replace"))
                sys.stdout.flush()
        if channel.exit_status_ready():
            while channel.recv_ready():
                chunk = channel.recv(4096)
                if chunk:
                    sys.stdout.write(chunk.decode("utf-8", errors="replace"))
                    sys.stdout.flush()
            break
        time.sleep(0.5)
    return channel.recv_exit_status()


def main() -> None:
    if not BUNDLE.is_file():
        raise SystemExit(f"Missing bundle: {BUNDLE}")
    cfg = load_deploy_env()
    host = cfg.get("DEPLOY_HOST", "")
    user = cfg.get("DEPLOY_USER", "root")
    port = int(cfg.get("DEPLOY_PORT", "22") or "22")
    password = cfg.get("DEPLOY_PASSWORD", "")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {user}@{host}:{port} ...")
    client.connect(host, port=port, username=user, password=password, timeout=60)

    sftp = client.open_sftp()
    print(f"Uploading bundle ({BUNDLE.stat().st_size // 1024} KB) ...")
    sftp.put(str(BUNDLE), "/tmp/foroushino-deploy.bundle")
    sftp.close()

    script_path = "/tmp/remote-deploy.sh"
    with client.open_sftp() as sftp:
        with sftp.file(script_path, "w") as f:
            f.write(REMOTE_DEPLOY.strip() + "\n")

    print("Starting remote deploy (build may take several minutes) ...")
    code = stream_exec(client, f"bash {script_path}")
    client.close()
    if code != 0:
        raise SystemExit(f"Deploy failed with exit code {code}")
    print("\nDeploy finished OK.")


if __name__ == "__main__":
    main()
