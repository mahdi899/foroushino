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
    "backend/app/Modules/TelegramBot/Services/TelegramOutboundMessenger.php",
    "backend/app/Modules/TelegramBot/Services/RequiredChatMembershipService.php",
    "backend/app/Modules/TelegramBot/Services/TelegramPurchaseFlowService.php",
    "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php",
    "backend/app/Modules/TelegramBot/Handlers/CallbackQueryHandler.php",
    "backend/app/Modules/TelegramBot/Jobs/ProcessTelegramUpdateJob.php",
    "backend/config/horizon.php",
    "backend/config/telegram.php",
    "backend/config/telegram_bot.php",
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
    "cd /var/www/bahram-cm/backend && "
    "php artisan config:cache && "
    "php artisan horizon:terminate && "
    "sleep 3 && "
    "supervisorctl restart bahram-horizon && "
    "sleep 2 && "
    "supervisorctl status bahram-horizon | head -2"
)
_, out, err = c.exec_command(cmd, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("ERR:", e)
c.close()
