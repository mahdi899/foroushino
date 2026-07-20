#!/usr/bin/env python3
"""Full production deploy: fix Next.js build, PHP 8.4, composer update."""
from __future__ import annotations

import io
import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[2]
DEPLOY_DIR = ROOT / "deploy"
ENV_FILE = DEPLOY_DIR / "deploy.env"
LOG = "/tmp/bahram-prod-php84.log"
DONE = "/tmp/bahram-prod-php84.done"

REMOTE = r"""#!/bin/bash
set -euo pipefail
APP=/var/www/bahram-cm
GIT=/var/www/foroushino
LOG=/tmp/bahram-prod-php84.log
exec > >(tee "$LOG") 2>&1
echo "=== PRODUCTION PHP 8.4 + FULL DEPLOY $(date -Is) ==="

export DEBIAN_FRONTEND=noninteractive

echo "==> [1] PHP 8.4 packages"
if ! dpkg -l php8.4-fpm >/dev/null 2>&1; then
  apt-get update -qq
  if ! apt-cache show php8.4-fpm >/dev/null 2>&1; then
    add-apt-repository -y ppa:ondrej/php
    apt-get update -qq
  fi
  apt-get install -y -qq \
    php8.4-fpm php8.4-cli php8.4-mysql php8.4-redis php8.4-mbstring \
    php8.4-xml php8.4-curl php8.4-gd php8.4-intl php8.4-zip php8.4-bcmath php8.4-ftp \
    php8.4-opcache php8.4-readline
fi
systemctl enable --now php8.4-fpm

echo "==> [2] Nginx upstream -> php8.4"
UP="/etc/nginx/conf.d/rostami-upstreams.conf"
if [[ -f "$UP" ]]; then
  sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' "$UP"
fi
php-fpm8.4 -t
nginx -t
systemctl restart php8.4-fpm
systemctl reload nginx

echo "==> [3] Backend composer"
cd "$APP/backend"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
php artisan migrate --force
php artisan storage:link 2>/dev/null || true
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> [4] Frontend build"
cd "$APP/frontend"
if ! npm ci; then npm install --no-audit --no-fund; fi
npm run build
test -f .next/BUILD_ID

echo "==> [5] PM2 reload"
pm2 reload "$APP/deploy/pm2/ecosystem.config.cjs" --update-env || pm2 start "$APP/deploy/pm2/ecosystem.config.cjs"
pm2 save
sleep 8

echo "==> [6] Supervisor restart"
supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null || true

echo "==> [7] Health checks"
curl -sf http://127.0.0.1:8010/up && echo " Laravel OK"
curl -sf -o /dev/null http://127.0.0.1:3000/ && echo " Next.js OK"
php -v | head -1
pm2 list | head -12
supervisorctl status | head -10

echo "=== DONE $(date -Is) ==="
"""


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def main() -> int:
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    cfg = load_env(ENV_FILE)
    host = cfg["DEPLOY_HOST"]
    user = cfg.get("DEPLOY_USER", "root")
    password = cfg["DEPLOY_PASSWORD"]
    port = int(cfg.get("DEPLOY_PORT", "22"))
    app = cfg.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
    git_root = cfg.get("DEPLOY_GIT_ROOT", "/var/www/foroushino")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {user}@{host}:{port} ...")
    client.connect(host, port, user, password, timeout=120, banner_timeout=120, auth_timeout=120)

    sftp = client.open_sftp()
    uploads = [
        (ROOT / "backend" / "composer.json", f"{app}/backend/composer.json"),
        (ROOT / "backend" / "composer.lock", f"{app}/backend/composer.lock"),
        (DEPLOY_DIR / "nginx" / "conf.d" / "rostami-upstreams.conf", "/etc/nginx/conf.d/rostami-upstreams.conf"),
        (DEPLOY_DIR / "scripts" / "upgrade-php-8.4.sh", f"{app}/deploy/scripts/upgrade-php-8.4.sh"),
    ]
    for local, remote in uploads:
        print(f"Upload {local.name} -> {remote}")
        sftp.put(str(local), remote)
    sftp.close()

    remote_path = "/tmp/bahram-prod-php84.sh"
    sftp = client.open_sftp()
    with sftp.file(remote_path, "w") as f:
        f.write(REMOTE)
    sftp.chmod(remote_path, 0o755)
    sftp.close()

    client.exec_command(f"rm -f {DONE}; nohup bash {remote_path}; echo $? > {DONE}", timeout=30)
    print("Deploy started. Polling (may take 10-15 min for npm build)...")

    for i in range(80):
        time.sleep(15)
        _, o, _ = client.exec_command(
            f"test -f {DONE} && echo FIN || echo RUN; tail -4 {LOG} 2>/dev/null",
            timeout=60,
        )
        out = o.read().decode("utf-8", errors="replace").strip()
        lines = out.split("\n")
        status = lines[0] if lines else "?"
        tail = lines[-1] if len(lines) > 1 else ""
        print(f"[{i*15:4d}s] {status} | {tail[-120:]}")
        if status == "FIN":
            _, o2, _ = client.exec_command(f"cat {DONE}; tail -60 {LOG}", timeout=120)
            print("\n=== FULL LOG (tail) ===")
            print(o2.read().decode("utf-8", errors="replace"))
            code = int(o2.read().decode() or "0") if False else 0
            _, o3, _ = client.exec_command(f"cat {DONE}", timeout=10)
            try:
                code = int(o3.read().decode().strip())
            except ValueError:
                code = 1
            client.close()
            return 0 if code == 0 else 1

    print("TIMEOUT waiting for deploy")
    client.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
