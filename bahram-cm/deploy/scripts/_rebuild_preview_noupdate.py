#!/usr/bin/env python3
"""Rebuild Family Manager web without pub get (deps already present)."""
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DEPLOY_ENV = Path(__file__).resolve().parents[1] / "deploy.env"
FLUTTER = "/var/www/foroushino/bahram-family-manager"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in DEPLOY_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def main() -> int:
    env = load_env()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        env["DEPLOY_HOST"],
        int(env.get("DEPLOY_PORT", "22")),
        env["DEPLOY_USER"],
        env["DEPLOY_PASSWORD"],
        timeout=120,
        banner_timeout=120,
    )

    remote_script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/family-preview-build.log
exec > >(tee "$LOG") 2>&1
echo "=== FAMILY PREVIEW BUILD $(date -Is) ==="
FLUTTER={FLUTTER}
FLUTTER_BIN="${{FLUTTER_BIN:-$FLUTTER/../.tools/flutter/bin/flutter}}"
cd "$FLUTTER"
# Skip pub get — pub.dev auth fails as root; packages already vendored.
"$FLUTTER_BIN" build web --release --base-href=/admin/ --dart-define=API_BASE_URL=https://rostami.club/api/v1
pm2 restart family-manager-web
pm2 save || true
curl -sf -o /dev/null -w 'admin:%{{http_code}}\\n' -H 'Host: rostami.club' http://127.0.0.1/admin/ || true
echo DONE
"""
    sftp = client.open_sftp()
    with sftp.file("/tmp/family_preview_build.sh", "w") as f:
        f.write(remote_script)
    sftp.chmod("/tmp/family_preview_build.sh", 0o755)
    sftp.close()

    print("Remote build started...")
    _, stdout, _ = client.exec_command(
        "nohup bash /tmp/family_preview_build.sh > /tmp/family-preview-build.nohup 2>&1 & echo $!",
        timeout=30,
    )
    pid = stdout.read().decode().strip()
    print(f"PID {pid}")

    for i in range(120):
        time.sleep(15)
        _, o, _ = client.exec_command(
            "tail -n 12 /tmp/family-preview-build.log 2>/dev/null; grep -q '^DONE$' /tmp/family-preview-build.log 2>/dev/null && echo __DONE__ || true",
            timeout=30,
        )
        out = o.read().decode("utf-8", "replace")
        print(f"[{(i+1)*15}s]\n{out[-1500:]}")
        if "__DONE__" in out:
            print("Build finished.")
            client.close()
            return 0
        _, st, _ = client.exec_command(f"kill -0 {pid} 2>/dev/null && echo RUN || echo DEAD", timeout=15)
        status = st.read().decode().strip()
        if status == "DEAD" and "__DONE__" not in out:
            _, err, _ = client.exec_command(
                "tail -n 100 /tmp/family-preview-build.log /tmp/family-preview-build.nohup 2>/dev/null",
                timeout=30,
            )
            print(err.read().decode("utf-8", "replace")[-5000:])
            client.close()
            return 1

    print("Timeout waiting for build")
    client.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
