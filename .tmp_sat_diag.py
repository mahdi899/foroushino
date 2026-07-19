import paramiko
import sys

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"

CHECKS = [
    "uptime; free -h; df -h /",
    "systemctl is-active nginx php8.3-fpm mysql redis-server supervisor 2>/dev/null; pm2 list 2>/dev/null || true",
    "ss -tlnp | grep -E ':80|:443|:6379|:3306|:9000' || true",
    "curl -sS -o /dev/null -w 'health_local:%{http_code} %{time_total}s\n' -H 'Host: sat.center' http://127.0.0.1/api/v1/health",
    "curl -sS -o /dev/null -w 'health_https:%{http_code} %{time_total}s\n' https://sat.center/api/v1/health",
    "curl -sS -o /dev/null -w 'index:%{http_code} %{time_total}s\n' https://sat.center/",
    "grep -E '^(APP_ENV|APP_DEBUG|CACHE_|QUEUE_|SESSION_|REDIS_|DB_)' /var/www/saat/backend/.env | head -30",
    "php -v | head -1",
    "cd /var/www/saat/backend && php artisan about --only=environment,cache,drivers 2>/dev/null | head -40",
    "supervisorctl status 2>/dev/null || true",
    "tail -n 5 /var/log/nginx/error.log 2>/dev/null; tail -n 5 /var/log/php8.3-fpm.log 2>/dev/null || true",
    "wc -l /var/www/saat/backend/storage/logs/laravel.log 2>/dev/null; tail -n 20 /var/www/saat/backend/storage/logs/laravel.log 2>/dev/null",
    "ls -la /etc/nginx/sites-enabled/ 2>/dev/null; nginx -t 2>&1",
    "cat /etc/nginx/sites-enabled/sat-center.conf 2>/dev/null | head -80 || cat /etc/nginx/sites-enabled/*sat* 2>/dev/null | head -80",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)
for cmd in CHECKS:
    sys.stdout.buffer.write(f"\n=== {cmd.split(';')[0][:60]} ===\n".encode())
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=180)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    if err.strip():
        sys.stdout.buffer.write(err.encode("utf-8", errors="replace"))
client.close()
