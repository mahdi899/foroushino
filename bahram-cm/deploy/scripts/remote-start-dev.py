#!/usr/bin/env python3
"""Run start-dev-server.sh on origin (requires SSH + deploy/deploy.env)."""
from __future__ import annotations

import io
import sys
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Install paramiko: pip install paramiko", file=sys.stderr)
    sys.exit(1)

APP = Path(__file__).resolve().parents[2]
ENV_FILE = APP / "deploy" / "deploy.env"
FILES = [
    "deploy/scripts/start-dev-server.sh",
    "deploy/scripts/start-prod-server.sh",
    "deploy/pm2/ecosystem.dev.config.cjs",
    "backend/app/Support/FamilyMediaUrl.php",
    "frontend/lib/mediaUrl.ts",
]


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise SystemExit(f"Missing {path} — copy deploy.env.example to deploy.env")
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value.strip()
    return out


def connect(env: dict[str, str]) -> paramiko.SSHClient:
    host = (env.get("DEPLOY_HOST") or "").strip()
    password = (env.get("DEPLOY_PASSWORD") or "").strip()
    if not host or not password:
        raise SystemExit("Set DEPLOY_HOST and DEPLOY_PASSWORD in deploy/deploy.env")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        host,
        int(env.get("DEPLOY_PORT", "22")),
        env.get("DEPLOY_USER", "root"),
        password,
        timeout=60,
        banner_timeout=120,
        auth_timeout=120,
    )
    return c


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 600) -> str:
    print(f"\n>>> {cmd[:100]}")
    _, o, e = client.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out:
        print(out)
    if err:
        print("ERR:", err[:800])
    return out


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

    env = load_env(ENV_FILE)
    root = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm").rstrip("/")
    c = connect(env)
    print("SSH OK")
    sftp = c.open_sftp()
    for rel in FILES:
        local = APP / rel
        remote = f"{root}/{rel.replace(chr(92), '/')}"
        print(f"upload {rel}")
        sftp.put(str(local), remote)
    sftp.close()

    run(c, f"chmod +x {root}/deploy/scripts/start-dev-server.sh {root}/deploy/scripts/start-prod-server.sh")
    run(c, f"bash {root}/deploy/scripts/start-dev-server.sh 2>&1 | tee /tmp/start-dev-server.log", timeout=900)
    c.close()
