#!/usr/bin/env python3
"""Deploy Saat frontend via SSH (reads saat/deploy/deploy.env)."""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = REPO_ROOT / "saat" / "deploy" / "deploy.env"
APP_DIR = "/var/www/saat"
# Optional deploy verification marker (uploaded before build when present locally).
LOCAL_VERIFY_FILE = REPO_ROOT / "saat" / "frontend" / "public" / "16916089.txt"


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise SystemExit(f"Missing {path}")
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value.strip()
    return out


def run_remote_command(client: paramiko.SSHClient, command: str, *, timeout: int = 1800) -> int:
    """Run a remote shell command and return its exit status."""
    print(f"\n=== {command} ===")
    _, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_status = stdout.channel.recv_exit_status()
    if out:
        print(out, end="" if out.endswith("\n") else "\n")
    if err.strip():
        print("STDERR:", err, end="" if err.endswith("\n") else "\n")
    if exit_status != 0:
        print(f"Command failed with exit code {exit_status}", file=sys.stderr)
    return exit_status


def upload_via_sftp(client: paramiko.SSHClient, local_path: Path, remote_path: str) -> None:
    """Upload a local file; always closes the SFTP session."""
    sftp = client.open_sftp()
    try:
        print(f"Uploading {local_path.name} -> {remote_path}")
        sftp.put(str(local_path), remote_path)
    finally:
        sftp.close()


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    cfg = load_env(ENV_FILE)
    host = cfg.get("DEPLOY_HOST", "")
    user = cfg.get("DEPLOY_USER", "root")
    password = cfg.get("DEPLOY_PASSWORD", "")
    port = int(cfg.get("DEPLOY_PORT", "22"))
    if not host or not password:
        raise SystemExit("DEPLOY_HOST and DEPLOY_PASSWORD required in deploy.env")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {user}@{host}:{port} ...")

    try:
        client.connect(host, port, user, password, timeout=120, banner_timeout=120, auth_timeout=120)

        if LOCAL_VERIFY_FILE.is_file():
            remote_public = f"{APP_DIR}/frontend/public/{LOCAL_VERIFY_FILE.name}"
            upload_via_sftp(client, LOCAL_VERIFY_FILE, remote_public)

        commands = [
            f"chmod +x {APP_DIR}/deploy/scripts/*.sh",
            f"cd {APP_DIR} && bash deploy/scripts/deploy.sh frontend",
        ]

        if LOCAL_VERIFY_FILE.is_file():
            commands.extend(
                [
                    "curl -sI https://sat.center/16916089.txt | head -15",
                    f"wc -c {APP_DIR}/frontend/dist/16916089.txt 2>/dev/null || echo dist-missing",
                    'curl -s -o /dev/null -w "http=%{http_code} size=%{size_download}\\n" https://sat.center/16916089.txt',
                ]
            )

        for command in commands:
            if run_remote_command(client, command) != 0:
                return 1

        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
