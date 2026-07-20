"""Shared helpers for one-off SSH deploy scripts.

All remote paths use DEPLOY_APP_ROOT from deploy.env (default /var/www/bahram-cm).
That path is the production app symlink used by deploy.sh, nginx, and PM2.
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[2]
DEPLOY_ENV_PATH = Path(__file__).resolve().parents[1] / "deploy.env"

DEFAULT_APP_ROOT = "/var/www/bahram-cm"
DEFAULT_GIT_ROOT = "/var/www/foroushino"


def configure_stdout() -> None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def load_deploy_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if not DEPLOY_ENV_PATH.exists():
        return env
    for line in DEPLOY_ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def app_root(env: dict[str, str] | None = None) -> str:
    env = env or load_deploy_env()
    return env.get("DEPLOY_APP_ROOT", DEFAULT_APP_ROOT).rstrip("/")


def git_root(env: dict[str, str] | None = None) -> str:
    env = env or load_deploy_env()
    return env.get("DEPLOY_GIT_ROOT", DEFAULT_GIT_ROOT).rstrip("/")


def backend_root(env: dict[str, str] | None = None) -> str:
    return f"{app_root(env)}/backend"


def remote_path(relative: str, env: dict[str, str] | None = None) -> str:
    rel = relative.replace("\\", "/").lstrip("/")
    return f"{app_root(env)}/{rel}"


def connect(env: dict[str, str] | None = None, timeout: int = 120) -> paramiko.SSHClient:
    env = env or load_deploy_env()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        env["DEPLOY_HOST"],
        int(env.get("DEPLOY_PORT", "22")),
        env["DEPLOY_USER"],
        env["DEPLOY_PASSWORD"],
        timeout=timeout,
    )
    return client


def upload_files(
    client: paramiko.SSHClient,
    uploads: list[tuple[Path, str]],
    env: dict[str, str] | None = None,
) -> None:
    """Upload local files. `uploads` items are (local_path, path_relative_to_app_root)."""
    sftp = client.open_sftp()
    try:
        for local, rel in uploads:
            remote = remote_path(rel, env)
            sftp.put(str(local), remote)
            print("uploaded", local.name, "->", remote)
    finally:
        sftp.close()
