#!/usr/bin/env python3
"""Download latest production MySQL dump and import into local Laragon DB."""
from __future__ import annotations

import gzip
import io
import os
import subprocess
import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[2]
DEPLOY_ENV = ROOT / "deploy" / "deploy.env"
BACKEND = ROOT / "backend"
LOCAL_ENV = BACKEND / ".env"


def load_deploy_env() -> dict[str, str]:
    if not DEPLOY_ENV.is_file():
        raise SystemExit(f"Missing {DEPLOY_ENV} — copy deploy.env.example and set DEPLOY_*.")
    out: dict[str, str] = {}
    for line in DEPLOY_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def load_local_db() -> dict[str, str]:
    if not LOCAL_ENV.is_file():
        raise SystemExit(f"Missing {LOCAL_ENV}")
    keys = ("DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD")
    out: dict[str, str] = {}
    for line in LOCAL_ENV.read_text(encoding="utf-8").splitlines():
        for key in keys:
            if line.startswith(f"{key}="):
                out[key] = line.split("=", 1)[1].strip().strip('"').strip("'")
    missing = [k for k in keys if k not in out]
    if missing:
        raise SystemExit(f"Local .env missing: {', '.join(missing)}")
    return out


def ssh_connect(cfg: dict[str, str]) -> paramiko.SSHClient:
    host = cfg.get("DEPLOY_HOST", "")
    user = cfg.get("DEPLOY_USER", "root")
    port = int(cfg.get("DEPLOY_PORT", "22") or "22")
    password = cfg.get("DEPLOY_PASSWORD", "")
    if not host:
        raise SystemExit("DEPLOY_HOST is empty in deploy.env")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        if password:
            client.connect(host, port=port, username=user, password=password, timeout=30)
        else:
            client.connect(host, port=port, username=user, timeout=30)
    except Exception as exc:
        raise SystemExit(
            f"SSH failed ({user}@{host}:{port}). Set DEPLOY_PASSWORD in deploy.env or configure SSH keys.\n{exc}"
        ) from exc
    return client


def remote_latest_backup(client: paramiko.SSHClient) -> tuple[str | None, int | None]:
    cmd = "ls -t /var/backups/bahram/db/bahram_*.sql.gz 2>/dev/null | head -1"
    _, stdout, _ = client.exec_command(cmd, timeout=60)
    path = stdout.read().decode("utf-8", errors="replace").strip() or None
    if not path:
        return None, None
    _, stat_out, _ = client.exec_command(f"stat -c %Y {path}", timeout=30)
    mtime_raw = stat_out.read().decode().strip()
    return path, int(mtime_raw) if mtime_raw.isdigit() else None


def remote_mysqldump(client: paramiko.SSHClient) -> bytes:
    app_root = os.environ.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
    env_path = f"{app_root}/backend/.env"
    inner = (
        f"set -a && source {env_path} && set +a && "
        "mysqldump -h\"$DB_HOST\" -P\"$DB_PORT\" -u\"$DB_USERNAME\" -p\"$DB_PASSWORD\" "
        "--single-transaction --quick --routines --triggers \"$DB_DATABASE\" | gzip -c"
    )
    cmd = "bash -lc " + repr(inner)
    _, stdout, stderr = client.exec_command(cmd, timeout=900)
    data = stdout.read()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if stdout.channel.recv_exit_status() != 0 or not data:
        raise SystemExit(f"Remote mysqldump failed: {err or 'empty output'}")
    return data


def sftp_download(client: paramiko.SSHClient, remote_path: str) -> bytes:
    with client.open_sftp() as sftp:
        buf = io.BytesIO()
        sftp.getfo(remote_path, buf)
        return buf.getvalue()


def import_local_gz(gz_bytes: bytes, local_db: dict[str, str]) -> None:
    sql = gzip.decompress(gz_bytes)
    if not sql.strip():
        raise SystemExit("Downloaded dump is empty.")

    tmp_dir = BACKEND / "storage" / "app" / "backups" / "database"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    gz_path = tmp_dir / "prod_sync_latest.sql.gz"
    sql_path = tmp_dir / "prod_sync_latest.sql"
    gz_path.write_bytes(gz_bytes)
    sql_path.write_bytes(sql)

    php = """
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
$file = new Illuminate\\Http\\UploadedFile(
    __DIR__.'/storage/app/backups/database/prod_sync_latest.sql.gz',
    'prod_sync_latest.sql.gz',
    'application/gzip',
    null,
    true
);
app(App\\Services\\DatabaseBackupService::class)->restoreUploadedFile($file);
echo "IMPORT_OK\\n";
"""
    script = BACKEND / "storage/app/backups/database/_prod_import_once.php"
    script.write_text(php, encoding="utf-8")
    try:
        proc = subprocess.run(
            ["php", str(script)],
            cwd=str(BACKEND),
            capture_output=True,
            text=True,
            timeout=3600,
            check=False,
        )
        if proc.returncode != 0 or "IMPORT_OK" not in (proc.stdout or ""):
            msg = (proc.stderr or proc.stdout or "").strip()
            raise SystemExit(f"Local import failed:\n{msg}")
    finally:
        script.unlink(missing_ok=True)


def main() -> None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    force_dump = "--fresh" in sys.argv or os.environ.get("PULL_DB_FRESH") == "1"
    deploy = load_deploy_env()
    local_db = load_local_db()
    print(f"Local target DB: {local_db['DB_DATABASE']} @ {local_db['DB_HOST']}")

    client = ssh_connect(deploy)
    try:
        remote, mtime = remote_latest_backup(client)
        stale = mtime is None or mtime < (time.time() - 86400)
        if remote and not force_dump and not stale:
            print(f"Downloading server backup: {remote}")
            gz_bytes = sftp_download(client, remote)
        else:
            if remote:
                print(f"Server backup is older than 24h ({remote}) — live mysqldump…")
            else:
                print("No server backup file — live mysqldump…")
            gz_bytes = remote_mysqldump(client)
        print(f"Downloaded {len(gz_bytes) / (1024 * 1024):.1f} MB (compressed)")
    finally:
        client.close()

    print("Importing into local MySQL (this may take a few minutes)…")
    import_local_gz(gz_bytes, local_db)
    print("Done. Local database matches the production dump.")


if __name__ == "__main__":
    main()
