import paramiko
import sys

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"

CHECKS = [
    "for i in 1 2 3; do curl -sS -o /dev/null -w \"try$i:%{time_total}s\\n\" -H 'Host: sat.center' http://127.0.0.1/api/v1/health -L; done",
    "redis-cli ping",
    "redis-cli --latency -c 3 2>/dev/null || redis-cli ping",
    "grep -E 'TELEPHONY|VOIP|BROADCAST' /var/www/saat/backend/.env",
    "cd /var/www/saat/backend && php artisan tinker --execute=\"\\$t=microtime(true); app(\\\\App\\\\Services\\\\Telephony\\\\VoipAdapter::class)->healthCheck(); echo round((microtime(true)-\\$t)*1000).'ms';\" 2>&1",
    "php -i | grep -E 'opcache.enable|opcache.enable_cli' | head -5",
    "ls -la /var/www/saat /var/www/foroushino/saat 2>/dev/null",
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
