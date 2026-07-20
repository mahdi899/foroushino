#!/usr/bin/env python3
"""One-off remote deploy helper — reads deploy.env locally."""
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ENV_FILE = Path(__file__).resolve().parents[1] / "deploy.env"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def connect(env: dict[str, str]) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        env["DEPLOY_HOST"],
        int(env.get("DEPLOY_PORT", "22")),
        env["DEPLOY_USER"],
        env["DEPLOY_PASSWORD"],
        timeout=120,
    )
    return client


def run_bahram_deploy() -> int:
    env = load_env()
    app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
    git_root = env.get("DEPLOY_GIT_ROOT", "/var/www/foroushino")

    remote_script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-deploy-backup.log
exec > >(tee "$LOG") 2>&1
echo "=== DEPLOY $(date -Is) ==="
cd {git_root}
git fetch origin main
git reset --hard origin/main
git clean -fd -- bahram-cm/deploy/scripts/upgrade-php-8.4.sh 2>/dev/null || true
echo GIT_HEAD=$(git rev-parse --short HEAD)
cd {app}
bash deploy/scripts/deploy.sh
echo "=== HEALTH ==="
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK || echo LARAVEL_FAIL
curl -sf -o /dev/null -w "NEXT:%{{http_code}}\\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "BAHRAM:%{{http_code}}\\n" -H "Host: rostami.app" http://127.0.0.1/
curl -sf -o /dev/null -w "FAMILY:%{{http_code}}\\n" -H "Host: rostami.club" http://127.0.0.1/
echo DONE
"""

    client = connect(env)
    sftp = client.open_sftp()
    with sftp.file("/tmp/bahram-deploy-backup.sh", "w") as handle:
        handle.write(remote_script)
    sftp.chmod("/tmp/bahram-deploy-backup.sh", 0o755)
    sftp.close()

    client.exec_command(
        "rm -f /tmp/bahram-deploy-backup.done; "
        "nohup bash /tmp/bahram-deploy-backup.sh; "
        "echo $? > /tmp/bahram-deploy-backup.done",
        timeout=30,
    )
    print("Bahram deploy started on", env["DEPLOY_HOST"])

    exit_code = 1
    for i in range(90):
        time.sleep(20)
        _, stdout, _ = client.exec_command(
            "test -f /tmp/bahram-deploy-backup.done && echo FIN || echo RUN; "
            "tail -2 /tmp/bahram-deploy-backup.log 2>/dev/null",
            timeout=60,
        )
        lines = stdout.read().decode().strip().split("\n")
        status = lines[0] if lines else "?"
        tail = lines[-1] if len(lines) > 1 else ""
        print(f"[{i * 20:4d}s] {status} | {tail[-120:]}")

        if status == "FIN":
            _, stdout, _ = client.exec_command(
                "cat /tmp/bahram-deploy-backup.done; tail -80 /tmp/bahram-deploy-backup.log",
                timeout=120,
            )
            output = stdout.read().decode("utf-8", errors="replace")
            print(output)
            try:
                exit_code = int(output.splitlines()[0].strip())
            except (IndexError, ValueError):
                exit_code = 0 if "DONE" in output else 1
            break
    else:
        print("TIMEOUT")
        _, stdout, _ = client.exec_command("tail -40 /tmp/bahram-deploy-backup.log", timeout=60)
        print(stdout.read().decode("utf-8", errors="replace"))

    client.close()
    return exit_code


def run_saat_deploy(host: str = "185.130.50.24") -> int:
    env = load_env()
    remote_script = """#!/bin/bash
set -euo pipefail
LOG=/tmp/saat-deploy-backup.log
exec > >(tee "$LOG") 2>&1
echo "=== SAAT DEPLOY $(date -Is) ==="
if [[ -d /var/www/mini-call-center/.git ]]; then
  cd /var/www/mini-call-center
elif [[ -d /var/www/saat/.git ]]; then
  cd /var/www/saat
else
  echo "No git repo"; exit 1
fi
git fetch origin main
git reset --hard origin/main
echo GIT_HEAD=$(git rev-parse --short HEAD)
cd /var/www/saat
bash deploy/scripts/deploy.sh all
echo "=== HEALTH ==="
curl -sf https://sat.center/api/v1/health && echo || curl -sf http://127.0.0.1/api/v1/health || true
curl -sf https://sat.center/version.json | head -c 200 || true
echo
echo DONE
"""

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            host,
            int(env.get("DEPLOY_PORT", "22")),
            env["DEPLOY_USER"],
            env["DEPLOY_PASSWORD"],
            timeout=120,
        )
    except Exception as exc:
        print(f"Saat SSH failed on {host}: {exc}")
        return 1

    sftp = client.open_sftp()
    with sftp.file("/tmp/saat-deploy-backup.sh", "w") as handle:
        handle.write(remote_script)
    sftp.chmod("/tmp/saat-deploy-backup.sh", 0o755)
    sftp.close()

    client.exec_command(
        "rm -f /tmp/saat-deploy-backup.done; "
        "nohup bash /tmp/saat-deploy-backup.sh; "
        "echo $? > /tmp/saat-deploy-backup.done",
        timeout=30,
    )
    print("Saat deploy started on", host)

    exit_code = 1
    for i in range(90):
        time.sleep(20)
        _, stdout, _ = client.exec_command(
            "test -f /tmp/saat-deploy-backup.done && echo FIN || echo RUN; "
            "tail -2 /tmp/saat-deploy-backup.log 2>/dev/null",
            timeout=60,
        )
        lines = stdout.read().decode().strip().split("\n")
        status = lines[0] if lines else "?"
        tail = lines[-1] if len(lines) > 1 else ""
        print(f"[{i * 20:4d}s] {status} | {tail[-120:]}")

        if status == "FIN":
            _, stdout, _ = client.exec_command(
                "cat /tmp/saat-deploy-backup.done; tail -80 /tmp/saat-deploy-backup.log",
                timeout=120,
            )
            output = stdout.read().decode("utf-8", errors="replace")
            print(output)
            try:
                exit_code = int(output.splitlines()[0].strip())
            except (IndexError, ValueError):
                exit_code = 0 if "DONE" in output else 1
            break
    else:
        print("TIMEOUT")
        _, stdout, _ = client.exec_command("tail -40 /tmp/saat-deploy-backup.log", timeout=60)
        print(stdout.read().decode("utf-8", errors="replace"))

    client.close()
    return exit_code


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "bahram"
    if target == "bahram":
        raise SystemExit(run_bahram_deploy())
    if target == "saat":
        raise SystemExit(run_saat_deploy())
    if target == "finish-bahram":
        env = load_env()
        app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
        client = connect(env)
        script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-finish.log
exec > >(tee "$LOG") 2>&1
APP={app}
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${{NODE_OPTIONS:---max-old-space-size=3072}}"
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 2>/dev/null
  chmod 600 /swapfile
  mkswap /swapfile 2>/dev/null || true
  swapon /swapfile 2>/dev/null || true
fi
cd $APP/frontend
npm ci || npm install --no-audit --no-fund
npm run build
test -f .next/BUILD_ID
pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --update-env || pm2 start $APP/deploy/pm2/ecosystem.config.cjs
pm2 restart family-manager-web 2>/dev/null || true
pm2 save
supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null || true
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK
curl -sf -o /dev/null -w "NEXT:%{{http_code}}\\n" http://127.0.0.1:3000/
echo DONE
"""
        sftp = client.open_sftp()
        with sftp.file("/tmp/bahram-finish.sh", "w") as handle:
            handle.write(script)
        sftp.chmod("/tmp/bahram-finish.sh", 0o755)
        sftp.close()
        client.exec_command(
            "rm -f /tmp/bahram-finish.done; nohup bash /tmp/bahram-finish.sh; echo $? > /tmp/bahram-finish.done",
            timeout=30,
        )
        print("Finishing Bahram frontend deploy...")
        for i in range(60):
            time.sleep(20)
            _, stdout, _ = client.exec_command(
                "test -f /tmp/bahram-finish.done && echo FIN || echo RUN; tail -2 /tmp/bahram-finish.log 2>/dev/null",
                timeout=60,
            )
            lines = stdout.read().decode().strip().split("\n")
            print(f"[{i * 20:4d}s] {lines[0] if lines else '?'} | {(lines[-1] if len(lines) > 1 else '')[-120:]}")
            if lines and lines[0] == "FIN":
                _, stdout, _ = client.exec_command("cat /tmp/bahram-finish.done; tail -40 /tmp/bahram-finish.log", timeout=120)
                print(stdout.read().decode("utf-8", errors="replace"))
                client.close()
                raise SystemExit(0)
        client.close()
        raise SystemExit(1)
    if target == "reload-bahram":
        env = load_env()
        app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
        client = connect(env)
        cmd = f"""bash -lc 'pm2 reload {app}/deploy/pm2/ecosystem.config.cjs --update-env; pm2 restart family-manager-web 2>/dev/null || true; pm2 save; supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null || true; pm2 list | head -8; curl -sf -o /dev/null -w \"next:%{{http_code}}\\n\" http://127.0.0.1:3000/'"""
        _, stdout, stderr = client.exec_command(cmd, timeout=120)
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err:
            print(err)
        client.close()
        raise SystemExit(0)
    if target == "repair-bahram":
        env = load_env()
        app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
        client = connect(env)
        script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-repair.log
exec > >(tee "$LOG") 2>&1
APP={app}
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${{NODE_OPTIONS:---max-old-space-size=3072}}"
export COMPOSER_ALLOW_SUPERUSER=1
cd $APP/frontend
unset NODE_ENV
npm ci
export NODE_ENV=production
npm run build
test -f .next/BUILD_ID
pm2 delete bahram-frontend 2>/dev/null || true
pm2 start $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env
pm2 save
sleep 5
curl -sf -o /dev/null -w "NEXT:%{{http_code}}\\n" http://127.0.0.1:3000/ || true
echo DONE
"""
        sftp = client.open_sftp()
        with sftp.file("/tmp/bahram-repair.sh", "w") as handle:
            handle.write(script)
        sftp.chmod("/tmp/bahram-repair.sh", 0o755)
        sftp.close()
        client.exec_command(
            "rm -f /tmp/bahram-repair.done; nohup bash /tmp/bahram-repair.sh; echo $? > /tmp/bahram-repair.done",
            timeout=30,
        )
        print("Repairing Bahram frontend...")
        for i in range(90):
            time.sleep(20)
            _, stdout, _ = client.exec_command(
                "test -f /tmp/bahram-repair.done && echo FIN || echo RUN; tail -2 /tmp/bahram-repair.log 2>/dev/null",
                timeout=60,
            )
            lines = stdout.read().decode().strip().split("\n")
            print(f"[{i * 20:4d}s] {lines[0] if lines else '?'} | {(lines[-1] if len(lines) > 1 else '')[-120:]}")
            if lines and lines[0] == "FIN":
                _, stdout, _ = client.exec_command("cat /tmp/bahram-repair.done; tail -30 /tmp/bahram-repair.log", timeout=120)
                print(stdout.read().decode("utf-8", errors="replace"))
                client.close()
                raise SystemExit(0)
        client.close()
        raise SystemExit(1)
    if target == "build-bahram":
        env = load_env()
        app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
        client = connect(env)
        cmd = f"""bash -lc 'set -e; APP={app}; export NODE_OPTIONS="--max-old-space-size=3072"; cd $APP/frontend; unset NODE_ENV; npm ci; export NODE_ENV=production; npm run build 2>&1; test -f .next/BUILD_ID; ls -la .next/BUILD_ID; pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env; sleep 5; curl -sf -o /dev/null -w "next:%{{http_code}}\\n" http://127.0.0.1:3000/'"""
        print("Running foreground build (may take several minutes)...")
        _, stdout, stderr = client.exec_command(cmd, timeout=900)
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err:
            print("STDERR:", err)
        client.close()
        raise SystemExit(0)
    if target == "logs-bahram":
        env = load_env()
        client = connect(env)
        for cmd in [
            "tail -80 /tmp/bahram-repair.log 2>/dev/null || true",
            "pm2 list",
            "pm2 logs bahram-frontend --lines 15 --nostream 2>&1 | tail -20",
            "test -d /var/www/bahram-cm/frontend/node_modules/@next/bundle-analyzer && echo HAS_ANALYZER || echo NO_ANALYZER",
        ]:
            print("===", cmd[:70], "===")
            _, stdout, _ = client.exec_command(cmd, timeout=90)
            print(stdout.read().decode("utf-8", errors="replace"))
        client.close()
        raise SystemExit(0)
    if target == "seminar-banners":
        env = load_env()
        app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
        backend = Path(__file__).resolve().parents[2] / "backend"
        site_local = backend / "storage" / "app" / "public" / "media" / "site"
        client = connect(env)
        sftp = client.open_sftp()
        remote_site = f"{app}/backend/storage/app/public/media/site"
        for name in [
            "seminar-promo-desktop-available.webp",
            "seminar-promo-desktop-full.webp",
            "seminar-promo-mobile-available.webp",
            "seminar-promo-mobile-full.webp",
        ]:
            sftp.put(str(site_local / name), f"{remote_site}/{name}")
        sftp.put(str(backend / "scripts" / "publish-seminar-banners.php"), f"{app}/backend/scripts/publish-seminar-banners.php")
        sftp.put(str(backend / "database" / "data" / "media_library.json"), f"{app}/backend/database/data/media_library.json")
        sftp.close()
        cmd = (
            f"cd {app}/backend && php scripts/publish-seminar-banners.php && "
            "curl -sk https://rostami.app/api/seminars/promo | head -c 600"
        )
        _, stdout, stderr = client.exec_command(cmd, timeout=180)
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err.strip():
            print("ERR:", err)
        client.close()
        raise SystemExit(0)
    if target == "fix-media-cors":
        env = load_env()
        app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
        deploy_root = Path(__file__).resolve().parents[1] / "nginx"
        client = connect(env)
        sftp = client.open_sftp()
        sftp.put(str(deploy_root / "snippets" / "media-cors.conf"), "/etc/nginx/snippets/media-cors.conf")
        sftp.put(str(deploy_root / "conf.d" / "rostami-upstreams.conf"), "/etc/nginx/conf.d/rostami-upstreams.conf")
        sftp.put(str(deploy_root / "rostami-app.conf"), "/etc/nginx/sites-available/rostami-app.conf")
        sftp.put(str(deploy_root / "rostami-club.conf"), "/etc/nginx/sites-available/rostami-club.conf")
        sftp.close()
        test_path = "/media/family/2026/07/image/01kxp67n1vbdn98dn7219wvdg4.webp"
        cmd = (
            "nginx -t && systemctl reload nginx && "
            f"grep -q '^FAMILY_MEDIA_CDN_URL=https://rostami.club' {app}/backend/.env || "
            f"sed -i 's|^FAMILY_MEDIA_CDN_URL=.*|FAMILY_MEDIA_CDN_URL=https://rostami.club|' {app}/backend/.env && "
            f"cd {app}/backend && php artisan config:cache && "
            f"php artisan cache:forget family:branding:public 2>/dev/null || true && "
            f"curl -skI -H 'Host: rostami.club' 'https://127.0.0.1{test_path}' | head -15"
        )
        _, stdout, stderr = client.exec_command(cmd, timeout=120)
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err.strip():
            print("ERR:", err)
        client.close()
        raise SystemExit(0)
    if target == "fix-php-uploads":
        env = load_env()
        app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
        client = connect(env)
        sftp = client.open_sftp()
        local_ini = Path(__file__).resolve().parents[1] / "php-fpm" / "99-bahram-uploads.ini"
        remote_ini = "/etc/php/8.4/fpm/conf.d/99-bahram-uploads.ini"
        sftp.put(str(local_ini), remote_ini)
        local_controller = Path(__file__).resolve().parents[2] / "backend" / "app" / "Http" / "Controllers" / "Api" / "V1" / "FamilyManager" / "MediaController.php"
        remote_controller = f"{app}/backend/app/Http/Controllers/Api/V1/FamilyManager/MediaController.php"
        sftp.put(str(local_controller), remote_controller)
        sftp.close()
        cmd = (
            f"cat /etc/php/8.4/fpm/conf.d/99-bahram-uploads.ini && "
            f"systemctl reload php8.4-fpm && "
            f"cd {app}/backend && php artisan route:cache && "
            f"php-fpm8.4 -i 2>/dev/null | grep -E 'upload_max_filesize|post_max_size' | head -2 && "
            f"supervisorctl status bahram-family-queue:* 2>/dev/null | head -3"
        )
        _, stdout, stderr = client.exec_command(cmd, timeout=120)
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err.strip():
            print("ERR:", err)
        client.close()
        raise SystemExit(0)
    if target == "diagnose-media":
        env = load_env()
        client = connect(env)
        for cmd in [
            "grep -R 'family-manager/media' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | head -20",
            'php -r \'echo "upload_max=".ini_get("upload_max_filesize")." post_max=".ini_get("post_max_size").PHP_EOL;\'',
            "tail -80 /var/www/bahram-cm/backend/storage/logs/laravel.log 2>/dev/null | tail -30",
            "ls -la /var/www/bahram-cm/backend/storage/app/family-ingest 2>/dev/null | head -5 || echo NO_INGEST_DIR",
        ]:
            print("===", cmd[:75], "===")
            _, stdout, stderr = client.exec_command(cmd, timeout=90)
            print(stdout.read().decode("utf-8", errors="replace"))
            err = stderr.read().decode("utf-8", errors="replace")
            if err.strip():
                print("ERR:", err)
        client.close()
        raise SystemExit(0)
    if target == "probe-saat":
        env = load_env()
        client = connect(env)
        for cmd in [
            "ls -la /var/www/saat 2>/dev/null || echo NO_SAAT",
            "hostname -I",
        ]:
            print("===", cmd, "===")
            _, stdout, _ = client.exec_command(cmd, timeout=60)
            print(stdout.read().decode("utf-8", errors="replace"))
        client.close()
        raise SystemExit(0)
    if target == "status":
        env = load_env()
        client = connect(env)
        for cmd in [
            "cd /var/www/foroushino && git rev-parse --short HEAD",
            "pm2 list | head -12",
            'curl -sf -o /dev/null -w "laravel:%{http_code}" http://127.0.0.1:8010/up; echo',
            'curl -sf -o /dev/null -w "next:%{http_code}" http://127.0.0.1:3000/; echo',
        ]:
            print("===", cmd[:70], "===")
            _, stdout, stderr = client.exec_command(cmd, timeout=90)
            print(stdout.read().decode("utf-8", errors="replace"))
            err = stderr.read().decode("utf-8", errors="replace")
            if err:
                print(err)
        client.close()
        raise SystemExit(0)
    raise SystemExit(f"Unknown target: {target}")
