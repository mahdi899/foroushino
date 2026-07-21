#!/usr/bin/env python3
"""Ensure bootstrap components exist, then rebuild."""
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
DEPLOY_ENV = Path(__file__).resolve().parents[1] / "deploy.env"
APP = "/var/www/foroushino/bahram-cm"
LOCAL_BOOT = ROOT / "bahram-cm/frontend/components/bootstrap"


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

    sftp = client.open_sftp()
    remote_dir = f"{APP}/frontend/components/bootstrap"
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        # create parents
        cur = ""
        for part in remote_dir.strip("/").split("/"):
            cur += "/" + part
            try:
                sftp.stat(cur)
            except FileNotFoundError:
                sftp.mkdir(cur)

    for local in sorted(LOCAL_BOOT.glob("*")):
        if not local.is_file():
            continue
        remote = f"{remote_dir}/{local.name}"
        print(f"upload {local.name}")
        sftp.put(str(local), remote)

    # also analytics + layout
    for rel in [
        "frontend/app/layout.tsx",
        "frontend/lib/analytics/index.ts",
    ]:
        local = ROOT / "bahram-cm" / rel
        remote = f"{APP}/{rel}"
        print(f"upload {rel}")
        sftp.put(str(local), remote)

    remote_script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-quiet-console2.log
exec > >(tee "$LOG") 2>&1
echo "=== BAHRAM QUIET CONSOLE 2 $(date -Is) ==="
ls -la {APP}/frontend/components/bootstrap/
SITE={APP}/backend/storage/app/public/media/site
mkdir -p "$SITE"
[[ -f "$SITE/logo-bahram.webp" ]] || cp -f /var/www/foroushino/bahram-family-manager/assets/branding/logo-bahram.webp "$SITE/logo-bahram.webp" || true
cd {APP}/frontend
export NODE_OPTIONS="${{NODE_OPTIONS:---max-old-space-size=3072}}"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
npm run build
pm2 restart bahram-frontend
curl -sf -o /dev/null -w 'app:%{{http_code}}\\n' -H 'Host: rostami.app' http://127.0.0.1/ || true
echo DONE
"""
    with sftp.file("/tmp/bahram_quiet_console2.sh", "w") as f:
        f.write(remote_script)
    sftp.chmod("/tmp/bahram_quiet_console2.sh", 0o755)
    sftp.close()

    _, stdout, _ = client.exec_command(
        "nohup bash /tmp/bahram_quiet_console2.sh > /tmp/bahram_quiet_console2.nohup 2>&1 & echo $!",
        timeout=30,
    )
    pid = stdout.read().decode().strip()
    print(f"PID {pid}")

    for i in range(100):
        time.sleep(15)
        _, o, _ = client.exec_command(
            "tail -n 14 /tmp/bahram-quiet-console2.log 2>/dev/null; "
            "grep -q '^DONE$' /tmp/bahram-quiet-console2.log 2>/dev/null && echo __DONE__ || true",
            timeout=30,
        )
        out = o.read().decode("utf-8", "replace")
        print(f"[{(i + 1) * 15}s]")
        print(out[-1500:])
        if "__DONE__" in out:
            print("OK")
            client.close()
            return 0
        _, st, _ = client.exec_command(f"kill -0 {pid} 2>/dev/null && echo RUN || echo DEAD", timeout=15)
        if st.read().decode().strip() == "DEAD":
            _, err, _ = client.exec_command(
                "tail -n 120 /tmp/bahram-quiet-console2.log /tmp/bahram_quiet_console2.nohup 2>/dev/null",
                timeout=30,
            )
            print(err.read().decode("utf-8", "replace")[-6000:])
            client.close()
            return 1

    print("timeout")
    client.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
