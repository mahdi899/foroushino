import sys
from pathlib import Path

from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()

files = [
    "backend/app/Modules/TelegramBot/Models/TelegramBot.php",
    "backend/app/Modules/TelegramBot/Http/Controllers/Admin/TelegramBotAdminController.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
]

uploads = [(ROOT / rel, rel.replace("\\", "/")) for rel in files]

c = connect(env)
upload_files(c, uploads, env)

cmd = (
    f"cd {backend_root(env)} && php artisan config:cache && "
    "php artisan route:cache && supervisorctl restart bahram-horizon"
)
_, out, err = c.exec_command(cmd, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("ERR:", e)
c.close()
