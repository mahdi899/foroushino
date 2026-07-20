import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
cmds = [
    "grep -E '8010|artisan serve|php-fpm' /etc/nginx/sites-available/*.conf /etc/supervisor/conf.d/* 2>/dev/null | head -20",
    f"grep -E 'FAMILY_MEDIA_FTP|BACKEND' {APP}/backend/.env | sed 's/PASSWORD=.*/PASSWORD=***/'",
    f"cd {APP}/backend && php artisan tinker --execute=\"try {{ \\\$d=Storage::disk('family_media_ftp'); echo 'ftp_ok:' . (\\\$d->exists('.') ? 'yes' : 'no'); }} catch (Throwable \\\$e) {{ echo 'ftp_err:' . \\\$e->getMessage(); }}\"",
    "tail -50 /var/log/nginx/error.log 2>/dev/null | tail -15",
    f"ls -la {APP}/backend/storage/logs/",
    f"tail -80 {APP}/backend/storage/logs/laravel-2026-07-20.log 2>/dev/null || tail -80 {APP}/backend/storage/logs/laravel.log 2>/dev/null",
    "supervisorctl tail -100 bahram-family-queue:bahram-family-queue_00 2>/dev/null | tail -30",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:72], "===")
    _, out, _ = c.exec_command(cmd, timeout=120)
    print(out.read().decode("utf-8", "replace")[:3000])
c.close()
