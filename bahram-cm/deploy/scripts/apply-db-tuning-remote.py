#!/usr/bin/env python3
"""One-shot: diagnose + apply MySQL/Redis tuning on production (uses deploy.env)."""
from __future__ import annotations

import sys
from importlib.machinery import SourceFileLoader
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "deploy" / "scripts"
pull = SourceFileLoader("pull_db", str(SCRIPTS / "pull-production-db.py")).load_module()

LOCAL_TUNE = ROOT / "deploy" / "scripts" / "tune-mysql.sh"
LOCAL_MIGRATION = (
    ROOT
    / "backend"
    / "database"
    / "migrations"
    / "2026_07_28_210000_add_high_traffic_performance_indexes.php"
)
LOCAL_MYSQL_README = ROOT / "deploy" / "mysql" / "README.md"
LOCAL_DEPLOY_SH = ROOT / "deploy" / "scripts" / "deploy.sh"
LOCAL_MONITORING = ROOT / "deploy" / "MONITORING.md"


def run(client, cmd: str, timeout: int = 120) -> tuple[int, str, str]:
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    return code, out, err


def main() -> int:
    cfg = pull.load_deploy_env()
    app = cfg.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
    print(f"Connecting {cfg.get('DEPLOY_USER')}@{cfg.get('DEPLOY_HOST')} ...")
    client = pull.ssh_connect(cfg)
    sftp = client.open_sftp()

    print("\n=== DIAGNOSE (before) ===")
    for cmd in (
        "hostname; free -h; nproc; df -h / | tail -1",
        "mysql -Nse \"SHOW VARIABLES WHERE Variable_name IN ('innodb_buffer_pool_size','innodb_buffer_pool_instances','slow_query_log','long_query_time','max_connections','version');\"",
        "redis-cli ping; redis-cli INFO memory | grep -E '^(used_memory_human|maxmemory_human|maxmemory_policy):'",
        f"grep -E '^(CACHE_STORE|QUEUE_CONNECTION|SESSION_DRIVER|DB_CONNECTION|REDIS_HOST)=' {app}/backend/.env",
        f"test -f {app}/deploy/scripts/tune-mysql.sh && echo TUNE_EXISTS || echo TUNE_MISSING",
    ):
        code, out, err = run(client, cmd)
        print(f"$ {cmd}")
        print(out or "(empty)")
        if err.strip():
            print("stderr:", err[:800])
        if code != 0:
            print(f"(exit {code})")

    # Upload files
    print("\n=== UPLOAD ===")
    remote_paths = [
        (LOCAL_TUNE, f"{app}/deploy/scripts/tune-mysql.sh"),
        (LOCAL_MIGRATION, f"{app}/backend/database/migrations/2026_07_28_210000_add_high_traffic_performance_indexes.php"),
        (LOCAL_MYSQL_README, f"{app}/deploy/mysql/README.md"),
        (LOCAL_DEPLOY_SH, f"{app}/deploy/scripts/deploy.sh"),
        (LOCAL_MONITORING, f"{app}/deploy/MONITORING.md"),
    ]
    for local, remote in remote_paths:
        if not local.is_file():
            print(f"SKIP missing local: {local}")
            continue
        # ensure remote dir
        remote_dir = str(Path(remote).as_posix().rsplit("/", 1)[0])
        run(client, f"mkdir -p {remote_dir}")
        sftp.put(str(local), remote)
        print(f"uploaded {local.name} -> {remote}")

    run(client, f"chmod +x {app}/deploy/scripts/tune-mysql.sh")

    print("\n=== APPLY tune-mysql.sh ===")
    code, out, err = run(client, f"bash {app}/deploy/scripts/tune-mysql.sh", timeout=180)
    print(out)
    if err.strip():
        print("stderr:", err[:2000])
    print(f"tune exit={code}")
    if code != 0:
        sftp.close()
        client.close()
        return code

    print("\n=== MIGRATE ===")
    code, out, err = run(
        client,
        f"cd {app}/backend && php artisan migrate --force --no-interaction --no-ansi",
        timeout=180,
    )
    sys.stdout.buffer.write((out + "\n").encode("utf-8", errors="replace"))
    if err.strip():
        sys.stdout.buffer.write(("stderr: " + err[:2000] + "\n").encode("utf-8", errors="replace"))
    print(f"migrate exit={code}")

    print("\n=== DIAGNOSE (after) ===")
    for cmd in (
        "mysql -Nse \"SHOW VARIABLES WHERE Variable_name IN ('innodb_buffer_pool_size','innodb_buffer_pool_instances','slow_query_log','long_query_time','max_connections');\"",
        "redis-cli ping; redis-cli INFO memory | grep -E '^(used_memory_human|maxmemory_human|maxmemory_policy):'",
        f"grep -E '^(CACHE_STORE|QUEUE_CONNECTION|SESSION_DRIVER)=' {app}/backend/.env",
        f"cd {app}/backend && php artisan migrate:status 2>/dev/null | grep high_traffic || true",
    ):
        _, out, err = run(client, cmd)
        print(f"$ {cmd}")
        print(out or "(empty)")
        if err.strip():
            print("stderr:", err[:500])

    sftp.close()
    client.close()
    print("\nDONE")
    return 0 if code == 0 else code


if __name__ == "__main__":
    raise SystemExit(main())
