#!/usr/bin/env python3
"""Upload story-view + FAB fixes and rebuild on production."""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

REPO = Path(__file__).resolve().parents[3]
ENV_FILE = REPO / "bahram-cm" / "deploy" / "deploy.env"

UPLOADS = [
    (
        REPO / "bahram-family-manager/lib/widgets/layout/desktop_shell.dart",
        "/var/www/foroushino/bahram-family-manager/lib/widgets/layout/desktop_shell.dart",
    ),
    (
        REPO / "bahram-family-manager/lib/features/stories/stories_screen.dart",
        "/var/www/foroushino/bahram-family-manager/lib/features/stories/stories_screen.dart",
    ),
    (
        REPO / "bahram-cm/backend/app/Http/Controllers/Api/V1/Family/StoryController.php",
        "/var/www/bahram-cm/backend/app/Http/Controllers/Api/V1/Family/StoryController.php",
    ),
    (
        REPO / "bahram-cm/backend/app/Services/Family/FamilyStoryService.php",
        "/var/www/bahram-cm/backend/app/Services/Family/FamilyStoryService.php",
    ),
    (
        REPO / "bahram-cm/backend/tests/Feature/Family/FamilyStoryViewTest.php",
        "/var/www/bahram-cm/backend/tests/Feature/Family/FamilyStoryViewTest.php",
    ),
    (
        REPO / "bahram-cm/frontend/components/family/StoryViewer.tsx",
        "/var/www/bahram-cm/frontend/components/family/StoryViewer.tsx",
    ),
    (
        REPO / "bahram-cm/frontend/lib/family/api.ts",
        "/var/www/bahram-cm/frontend/lib/family/api.ts",
    ),
]


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
    try:
        client.connect(host, port, user, password, timeout=120, banner_timeout=120, auth_timeout=120)
    except Exception as exc:
        print(f"SSH failed: {exc}", file=sys.stderr)
        return 1

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

    commands = [
        "cd /var/www/bahram-cm/backend && php artisan config:clear && php artisan route:clear && php artisan route:cache",
        "systemctl reload php8.4-fpm 2>/dev/null || true",
        "cd /var/www/foroushino/bahram-family-manager && bash scripts/build-web-production.sh",
        "pm2 restart family-manager-web 2>/dev/null || pm2 reload /var/www/bahram-cm/deploy/pm2/ecosystem.config.cjs --only family-manager-web",
        "bash /var/www/bahram-cm/deploy/scripts/rebuild-frontend.sh",
        "curl -s -o /dev/null -w 'flutter=%{http_code}\\n' http://127.0.0.1:7358/admin/",
        "curl -s -o /dev/null -w 'next=%{http_code}\\n' http://127.0.0.1:3000/family/",
    ]

    rc = 0
    for cmd in commands:
        if run(client, cmd) != 0:
            rc = 1
    client.close()
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
