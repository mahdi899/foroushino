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

files = [
    "backend/app/Modules/TelegramBot/Models/TelegramBot.php",
    "backend/app/Modules/TelegramBot/Http/Controllers/Admin/TelegramBotAdminController.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
s = c.open_sftp()
for rel in files:
    s.put(str(ROOT / rel), f"/var/www/foroushino/bahram-cm/{rel.replace(chr(92), '/')}")
    print("uploaded", Path(rel).name)
s.close()

cmd = (
    "cd /var/www/bahram-cm/backend && php artisan config:cache && "
    "php artisan route:cache && supervisorctl restart bahram-horizon"
)
_, out, err = c.exec_command(cmd, timeout=120)
print(out.read().decode("utf-8", "replace"))
if err.read().decode("utf-8", "replace").strip():
    print("ERR:", err.read())
c.close()
