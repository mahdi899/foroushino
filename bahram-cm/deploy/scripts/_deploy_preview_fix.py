#!/usr/bin/env python3
"""Upload media-preview fix for Family Manager and rebuild Flutter web on prod."""
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[3]
DEPLOY_ENV = Path(__file__).resolve().parents[1] / "deploy.env"
FLUTTER = "/var/www/foroushino/bahram-family-manager"

UPLOADS = [
    "lib/features/posts/post_editor_screen.dart",
    "lib/widgets/media/family_media_view.dart",
    "lib/widgets/media/media_thumbnail.dart",
    "lib/services/family_manager_service.dart",
    "lib/core/utils/local_media_url.dart",
    "lib/core/utils/local_media_url_stub.dart",
    "lib/core/utils/local_media_url_web.dart",
    "lib/core/utils/local_media_url_io.dart",
    "lib/core/utils/media_playback_source.dart",
    "lib/core/utils/media_playback_source_stub.dart",
    "lib/core/utils/media_playback_source_web.dart",
    "lib/core/utils/media_playback_source_io.dart",
]


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
    for rel in UPLOADS:
        local = ROOT / "bahram-family-manager" / rel
        remote = f"{FLUTTER}/{rel}"
        # ensure remote dir
        remote_dir = str(Path(remote).parent).replace("\\", "/")
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            parts = remote_dir.strip("/").split("/")
            cur = ""
            for part in parts:
                cur += "/" + part
                try:
                    sftp.stat(cur)
                except FileNotFoundError:
                    sftp.mkdir(cur)
        print(f"upload {rel}")
        sftp.put(str(local), remote)
    sftp.close()

    remote_script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/family-preview-fix.log
exec > >(tee "$LOG") 2>&1
echo "=== FAMILY PREVIEW FIX $(date -Is) ==="
FLUTTER={FLUTTER}
FLUTTER_BIN="${{FLUTTER_BIN:-$FLUTTER/../.tools/flutter/bin/flutter}}"
cd "$FLUTTER"
"$FLUTTER_BIN" pub get
"$FLUTTER_BIN" build web --release --base-href=/admin/ --dart-define=API_BASE_URL=https://rostami.club/api/v1
pm2 restart family-manager-web
pm2 save || true
curl -sf -o /dev/null -w 'admin:%{{http_code}}\\n' -H 'Host: rostami.club' http://127.0.0.1/admin/ || true
echo DONE
"""
    sftp = client.open_sftp()
    with sftp.file("/tmp/family_preview_fix.sh", "w") as f:
        f.write(remote_script)
    sftp.chmod("/tmp/family_preview_fix.sh", 0o755)
    sftp.close()

    print("Remote rebuild started...")
    _, stdout, stderr = client.exec_command(
        "nohup bash /tmp/family_preview_fix.sh > /tmp/family-preview-fix.nohup 2>&1 & echo $!",
        timeout=30,
    )
    pid = stdout.read().decode().strip()
    print(f"PID {pid}")

    for i in range(90):
        time.sleep(10)
        _, o, _ = client.exec_command(
            "tail -n 8 /tmp/family-preview-fix.log 2>/dev/null; grep -q '^DONE$' /tmp/family-preview-fix.log 2>/dev/null && echo __DONE__ || true",
            timeout=30,
        )
        out = o.read().decode("utf-8", "replace")
        print(f"[{(i+1)*10}s]\n{out[-1200:]}")
        if "__DONE__" in out:
            print("Rebuild finished.")
            client.close()
            return 0
        _, st, _ = client.exec_command(f"kill -0 {pid} 2>/dev/null && echo RUN || echo DEAD", timeout=15)
        status = st.read().decode().strip()
        if status == "DEAD" and "__DONE__" not in out:
            _, err, _ = client.exec_command("tail -n 80 /tmp/family-preview-fix.log /tmp/family-preview-fix.nohup 2>/dev/null", timeout=30)
            print(err.read().decode("utf-8", "replace")[-4000:])
            client.close()
            return 1

    print("Timeout waiting for rebuild")
    client.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
