#!/usr/bin/env python3
"""
SSH to Bahram/Family server, upload latest frontend fixes, switch to DEV mode (next dev).

Reads credentials from bahram-cm/deploy/deploy.env (see deploy.env.example).
Usage (from repo root):
  python bahram-cm/deploy/scripts/remote-start-dev-server.py
"""
from __future__ import annotations

import io
import os
import sys
import time
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Install paramiko: pip install paramiko", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[3]
DEPLOY_DIR = REPO_ROOT / "bahram-cm" / "deploy"
ENV_FILE = DEPLOY_DIR / "deploy.env"
LOCAL_DEV_SCRIPT = Path(__file__).resolve().parent / "start-dev-server.sh"

UPLOAD_REL = [
    "frontend/lib/domains.ts",
    "frontend/middleware.ts",
    "frontend/app/layout.tsx",
    "frontend/app/loading.tsx",
    "frontend/app/family/layout.tsx",
    "frontend/app/family/login/page.tsx",
    "frontend/components/layout/AdminAwareChrome.tsx",
    "frontend/components/layout/SiteBootLoader.tsx",
    "frontend/components/nav/FamilyNavButton.tsx",
    "frontend/components/sections/FamilyPulseSection.tsx",
    "frontend/components/family/NotificationBell.tsx",
    "frontend/components/family/FamilyGuestAuth.tsx",
    "frontend/lib/family/join-context.ts",
    "frontend/styles/family.css",
    "deploy/scripts/start-dev-server.sh",
    "deploy/scripts/start-prod-server.sh",
    "deploy/pm2/ecosystem.dev.config.cjs",
]


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        print(f"Missing {path} — copy deploy.env.example to deploy.env", file=sys.stderr)
        sys.exit(1)
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def connect(cfg: dict[str, str]) -> paramiko.SSHClient:
    host = cfg.get("DEPLOY_HOST", "")
    user = cfg.get("DEPLOY_USER", "root")
    password = cfg.get("DEPLOY_PASSWORD", "")
    port = int(cfg.get("DEPLOY_PORT", "22"))
    if not host or not password:
        print("DEPLOY_HOST and DEPLOY_PASSWORD required in deploy.env", file=sys.stderr)
        sys.exit(1)

    last_exc: Exception | None = None
    for attempt in range(8):
        try:
            c = paramiko.SSHClient()
            c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            print(f"Connecting to {user}@{host}:{port} (attempt {attempt + 1})...")
            c.connect(
                host,
                port,
                user,
                password,
                timeout=120,
                banner_timeout=180,
                auth_timeout=120,
                look_for_keys=False,
                allow_agent=False,
            )
            return c
        except Exception as exc:
            last_exc = exc
            print(f"  failed: {exc}")
            time.sleep(25)
    raise last_exc or RuntimeError("SSH connect failed")


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 7200) -> str:
    print(f"\n$ {cmd[:160]}")
    _, stdout, stderr = c.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    text = (out + err).strip()
    print(text[-12000:] if len(text) > 12000 else text)
    return text


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    cfg = load_env(ENV_FILE)
    app_root = cfg.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
    bahram_root = REPO_ROOT / "bahram-cm"

    client = connect(cfg)
    sftp = client.open_sftp()

    for rel in UPLOAD_REL:
        local = bahram_root / rel.replace("/", os.sep)
        remote = f"{app_root}/{rel}"
        if not local.is_file():
            print(f"skip missing local file: {local}")
            continue
        print(f"upload {rel}")
        sftp.put(str(local), remote)

    sftp.put(str(LOCAL_DEV_SCRIPT), f"{app_root}/deploy/scripts/start-dev-server.sh")
    sftp.close()

    run(client, f"chmod +x {app_root}/deploy/scripts/start-dev-server.sh {app_root}/deploy/scripts/start-prod-server.sh")
    run(client, f"bash {app_root}/deploy/scripts/start-dev-server.sh", timeout=7200)
    run(client, "pm2 list; test -f /var/www/.bahram-dev-mode && cat /var/www/.bahram-dev-mode")
    run(client, "curl -skI http://127.0.0.1:3000/ | head -5 || true")

    client.close()
    print("\n=== DEV mode active. Restore prod: bash deploy/scripts/start-prod-server.sh on server ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
