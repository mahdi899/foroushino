import sys
from pathlib import Path

from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()

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

uploads = [(ROOT / rel, rel.replace("\\", "/")) for rel in files]

c = connect(env)
upload_files(c, uploads, env)

cmd = (
    f"cd {backend_root(env)} && "
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
