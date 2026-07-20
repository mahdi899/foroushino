import io
import sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parents[2]
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

uploads = [
    (ROOT / "backend/app/Support/InflatedMemberCount.php", "/var/www/foroushino/bahram-cm/backend/app/Support/InflatedMemberCount.php"),
    (ROOT / "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php", "/var/www/foroushino/bahram-cm/backend/app/Modules/TelegramBot/Handlers/MessageHandler.php"),
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
for local, remote in uploads:
    sftp.put(str(local), remote)
    print("uploaded", local.name)
sftp.close()
_, out, _ = c.exec_command(
    "cd /var/www/bahram-cm/backend && composer dump-autoload -o --no-interaction 2>&1 | tail -3 && supervisorctl restart bahram-horizon",
    timeout=120,
)
print(out.read().decode("utf-8", "replace"))
c.close()
