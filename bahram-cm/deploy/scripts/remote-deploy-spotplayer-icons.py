#!/usr/bin/env python3
"""Upload SpotPlayer OS icons + panel component; push media to CDN and rebuild frontend."""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

REPO = Path(__file__).resolve().parents[3]
ENV_FILE = REPO / "bahram-cm" / "deploy" / "deploy.env"
SITE_MEDIA = REPO / "bahram-cm" / "backend" / "storage" / "app" / "public" / "media" / "site"

UPLOADS: list[tuple[Path, str]] = [
    (
        REPO / "bahram-cm/frontend/components/student-panel/courses/SpotPlayerDownloadGrid.tsx",
        "/var/www/bahram-cm/frontend/components/student-panel/courses/SpotPlayerDownloadGrid.tsx",
    ),
    (
        REPO / "bahram-cm/backend/database/data/media_library.json",
        "/var/www/bahram-cm/backend/database/data/media_library.json",
    ),
    (
        REPO / "bahram-cm/backend/routes/api_v1.php",
        "/var/www/bahram-cm/backend/routes/api_v1.php",
    ),
]

for name in (
    "platform-windows.png",
    "platform-macos.png",
    "platform-android.png",
    "platform-web.png",
    "platform-ios.png",
    "platform-ubuntu.png",
):
    UPLOADS.append((SITE_MEDIA / name, f"/var/www/bahram-cm/backend/storage/app/public/media/site/{name}"))


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def run(client: paramiko.SSHClient, command: str, timeout: int = 3600) -> int:
    print(f"\n=== {command} ===")
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out, end="" if out.endswith("\n") else "\n")
    if err.strip():
        print("STDERR:", err, end="" if err.endswith("\n") else "\n")
    print(f"exit={code}")
    return code


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    if not ENV_FILE.is_file():
        print(f"Missing {ENV_FILE}", file=sys.stderr)
        return 1

    cfg = load_env(ENV_FILE)
    host = cfg.get("DEPLOY_HOST", "")
    user = cfg.get("DEPLOY_USER", "root")
    password = cfg.get("DEPLOY_PASSWORD", "")
    port = int(cfg.get("DEPLOY_PORT", "22"))
    if not host or not password:
        print("DEPLOY_HOST and DEPLOY_PASSWORD required", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {user}@{host}:{port} ...")
    client.connect(host, port, user, password, timeout=120, banner_timeout=120, auth_timeout=120)

    sftp = client.open_sftp()
    try:
        for local, remote in UPLOADS:
            if not local.is_file():
                print(f"SKIP missing local: {local}")
                continue
            print(f"Upload {local.name} -> {remote}")
            sftp.put(str(local), remote)
    finally:
        sftp.close()

    push_cdn = (
        "cd /var/www/bahram-cm/backend && php -r "
        "'require \"vendor/autoload.php\"; "
        "$app = require \"bootstrap/app.php\"; "
        "$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); "
        "$disk = config(\"bahram.uploads.public_disk\"); "
        "$dir = storage_path(\"app/public/media/site\"); "
        "foreach (glob($dir . \"/platform-*.png\") as $abs) { "
        "$rel = \"media/site/\" . basename($abs); "
        "Illuminate\\\\Support\\\\Facades\\\\Storage::disk($disk)->put($rel, file_get_contents($abs)); "
        "echo \"cdn: $rel\\n\"; "
        "}'"
    )

    commands = [
        "mkdir -p /var/www/bahram-cm/backend/storage/app/public/media/site",
        "cd /var/www/bahram-cm/backend && php artisan media:sync --import",
        push_cdn,
        "cd /var/www/bahram-cm/backend && php artisan config:clear && php artisan route:clear && php artisan route:cache",
        "systemctl reload php8.4-fpm 2>/dev/null || true",
        "bash /var/www/bahram-cm/deploy/scripts/rebuild-frontend.sh",
        "curl -s -o /dev/null -w 'panel_courses=%{http_code}\\n' https://rostami.app/panel/courses",
        "curl -sI https://cdn.rostami.app/media/site/platform-windows.png | head -3",
    ]

    rc = 0
    for cmd in commands:
        if run(client, cmd) != 0:
            rc = 1
    client.close()
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
