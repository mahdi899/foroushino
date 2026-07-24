#!/usr/bin/env python3
"""Upload panel.css from local repo and rebuild frontend on production."""
from __future__ import annotations

import io
import subprocess
import sys
from pathlib import Path

import paramiko

REPO = Path(__file__).resolve().parents[3]
ENV_FILE = REPO / "bahram-cm" / "deploy" / "deploy.env"
LOCAL = REPO / "bahram-cm" / "frontend" / "styles" / "panel.css"
REMOTE = "/var/www/bahram-cm/frontend/styles/panel.css"


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    cfg = load_env(ENV_FILE)
    host = cfg["DEPLOY_HOST"]
    user = cfg.get("DEPLOY_USER", "root")
    password = cfg["DEPLOY_PASSWORD"]
    port = int(cfg.get("DEPLOY_PORT", "22"))

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {user}@{host}:{port} ...")
    client.connect(host, port, user, password, timeout=120, banner_timeout=120, auth_timeout=120)

    sftp = client.open_sftp()
    print(f"Upload {LOCAL.name} -> {REMOTE}")
    sftp.put(str(LOCAL), REMOTE)
    sftp.close()
    client.close()

    rebuild = REPO / "bahram-cm" / "deploy" / "scripts" / "remote-rebuild-frontend.py"
    return subprocess.call([sys.executable, str(rebuild)])


if __name__ == "__main__":
    raise SystemExit(main())
