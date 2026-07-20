#!/usr/bin/env python3
"""
SSH to Bahram/Family server and rebuild Next.js frontend.

Reads credentials from bahram-cm/deploy/deploy.env (see deploy.env.example).
Usage (from repo root):
  python bahram-cm/deploy/scripts/remote-rebuild-frontend.py
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
LOCAL_SCRIPT = Path(__file__).resolve().parent / "rebuild-frontend.sh"
REMOTE_SCRIPT = "/tmp/rebuild-frontend.sh"
REMOTE_LOG = "/tmp/bahram-frontend-rebuild.log"
REMOTE_DONE = "/tmp/bahram-frontend-rebuild.done"


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
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {user}@{host}:{port} ...")
    c.connect(
        host,
        port,
        user,
        password,
        timeout=120,
        banner_timeout=120,
        auth_timeout=120,
    )
    return c


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    cfg = load_env(ENV_FILE)
    app_root = cfg.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
    git_root = cfg.get("DEPLOY_GIT_ROOT", "/var/www/foroushino")

    c = connect(cfg)
    sftp = c.open_sftp()
    sftp.put(str(LOCAL_SCRIPT), REMOTE_SCRIPT)
    sftp.close()

    wrapper = (
        f"chmod +x {REMOTE_SCRIPT}; rm -f {REMOTE_DONE}; "
        f"APP_ROOT={app_root} GIT_ROOT={git_root} FRONTEND={app_root}/frontend "
        f"nohup bash {REMOTE_SCRIPT} > {REMOTE_LOG} 2>&1; echo $? > {REMOTE_DONE}"
    )
    c.exec_command(wrapper, timeout=30)
    print("Build started on server. Polling log ...")

    for i in range(120):
        time.sleep(15)
        try:
            _, o, _ = c.exec_command(
                f"test -f {REMOTE_DONE} && echo FIN || echo RUN; "
                f"test -f {app_root}/frontend/.next/BUILD_ID && echo HAS_BUILD; "
                f"tail -3 {REMOTE_LOG} 2>/dev/null | sed 's/\\x1b\\[[0-9;]*m//g'",
                timeout=45,
            )
            out = o.read().decode("utf-8", errors="replace").strip()
            line = out.split("\n")[-1] if out else ""
            print(f"[{i * 15:4d}s] {out.split(chr(10))[0]} | {line[-100:]}")
            if "FIN" in out.split("\n")[0]:
                _, o2, _ = c.exec_command(
                    f"cat {REMOTE_DONE}; tail -30 {REMOTE_LOG} | sed 's/\\x1b\\[[0-9;]*m//g'",
                    timeout=60,
                )
                result = o2.read().decode("utf-8", errors="replace")
                print("\n=== RESULT ===")
                print(result)
                first_line = result.split("\n", 1)[0].strip()
                try:
                    code = int(first_line)
                except ValueError:
                    code = 1
                c.close()
                return 0 if code == 0 else 1
        except Exception as exc:
            print(f"[{i * 15:4d}s] poll error: {exc}")
            c.close()
            c = connect(cfg)

    print(f"Timed out. SSH in and check: tail -f {REMOTE_LOG}", file=sys.stderr)
    c.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
