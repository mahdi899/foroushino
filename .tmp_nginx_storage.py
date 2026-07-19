import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("185.130.50.24", 22, "root", "45J8pr+1gU=65e", timeout=15)
_, o, _ = c.exec_command(
    "ls -la /var/www/saat/backend/storage/app/public/avatars/users/; "
    "grep -A6 'location \^~ /storage' /etc/nginx/sites-available/sat-center.conf; "
    "curl -sS -o /dev/null -w 'local=%{http_code}\n' http://127.0.0.1/storage/avatars/users/1.jpg",
    timeout=20,
)
print(o.read().decode("utf-8", errors="replace"))
c.close()
