import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

cmds = [
    "tail -150 /var/www/bahram-cm/backend/storage/logs/laravel.log 2>/dev/null | grep -iE 'family|media|optimize|ftp|video|failed|error' | tail -40",
    "supervisorctl status bahram-family-queue:* 2>/dev/null | head -5",
    "php-fpm8.4 -i 2>/dev/null | grep -E 'upload_max|post_max|memory_limit' | head -5",
    "grep -E 'FAMILY_|MEDIA_|FTP|OPTIMIZE' /var/www/bahram-cm/backend/.env | grep -v PASSWORD | grep -v SECRET | head -25",
    "ls -la /var/www/bahram-cm/backend/storage/app/family-ingest 2>/dev/null | tail -5",
    "redis-cli LLEN queues:family-media 2>/dev/null; redis-cli LLEN queues:default 2>/dev/null",
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:75], "===")
    _, out, err = c.exec_command(cmd, timeout=90)
    print(out.read().decode("utf-8", "replace"))
    e = err.read().decode("utf-8", "replace")
    if e.strip():
        print("ERR:", e[:300])
c.close()
