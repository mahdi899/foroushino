import paramiko
import re
import sys

HOST = "185.130.50.24"
USER = "root"
PASSWORD = "45J8pr+1gU=65e"

POOL = "/etc/php/8.3/fpm/pool.d/www.conf"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)

def run(cmd, timeout=180):
    sys.stdout.buffer.write(f"\n$ {cmd}\n".encode())
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    if err.strip():
        sys.stdout.buffer.write(err.encode("utf-8", errors="replace"))
    return out

# 1) Backup + tune PHP-FPM pool
run(f"cp -a {POOL} {POOL}.bak.$(date +%Y%m%d%H%M%S)")
sftp = client.open_sftp()
with sftp.open(POOL, "r") as f:
    content = f.read().decode("utf-8")

replacements = {
    r"^pm = .*": "pm = dynamic",
    r"^pm\.max_children = .*": "pm.max_children = 15",
    r"^pm\.start_servers = .*": "pm.start_servers = 4",
    r"^pm\.min_spare_servers = .*": "pm.min_spare_servers = 2",
    r"^pm\.max_spare_servers = .*": "pm.max_spare_servers = 8",
}
for pattern, value in replacements.items():
    content, n = re.subn(pattern, value, content, count=1, flags=re.MULTILINE)
    if n == 0:
        content += f"\n{value}\n"

with sftp.open(POOL, "w") as f:
    f.write(content)
sftp.close()

run("grep -E '^pm\\.|^pm ' " + POOL)
run("php-fpm8.3 -t")
run("systemctl restart php8.3-fpm && systemctl is-active php8.3-fpm")

# 2) Laravel optimize
run("cd /var/www/saat/backend && php artisan optimize:clear")
run("cd /var/www/saat/backend && php artisan config:cache && php artisan route:cache && php artisan view:cache")
run("systemctl reload nginx")

# 3) Quick latency check (localhost, no hairpin)
run("for i in 1 2 3 4 5; do curl -sS -o /dev/null -w \"health$i:%{http_code} %{time_total}s\\n\" -H 'Host: sat.center' http://127.0.0.1/api/v1/health -L; done", timeout=120)

client.close()
print("\nDONE", file=sys.stderr)
