import paramiko
import sys

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"

CHECKS = [
    "grep -E '^pm\\.|^pm ' /etc/php/8.3/fpm/pool.d/www.conf",
    "grep -E 'max_execution|request_terminate' /etc/php/8.3/fpm/pool.d/www.conf /etc/php/8.3/fpm/php.ini 2>/dev/null | head -10",
    "curl -sS -o /dev/null -w 'api_health:%{http_code} %{time_total}s\\n' -H 'Host: sat.center' http://127.0.0.1/api/v1/health -L",
    "cd /var/www/saat/backend && time php artisan route:list --path=api/v1/health 2>&1 | tail -3",
    "cd /var/www/saat/backend && php -r \"require 'vendor/autoload.php'; \\$app=require 'bootstrap/app.php'; \\$kernel=\\$app->make(Illuminate\\Contracts\\Console\\Kernel::class); \\$kernel->bootstrap(); echo 'boot:'.round((microtime(true)-\\$_SERVER['REQUEST_TIME_FLOAT'])*1000).'ms';\" 2>&1",
    "mysql -usaat -pJyxu9MIX3zJXZ3cIpM9ikos3dp6iXQuz saat -e 'SHOW TABLE STATUS LIKE \"leads\"\\G' 2>/dev/null | grep -E 'Rows|Data_length'",
    "mysql -usaat -pJyxu9MIX3zJXZ3cIpM9ikos3dp6iXQuz saat -e 'SELECT COUNT(*) leads FROM leads; SELECT COUNT(*) users FROM users;' 2>/dev/null",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)
for cmd in CHECKS:
    sys.stdout.buffer.write(f"\n=== {cmd.split(';')[0][:70]} ===\n".encode())
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
client.close()
