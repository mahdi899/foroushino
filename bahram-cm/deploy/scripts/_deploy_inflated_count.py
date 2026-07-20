import sys
from pathlib import Path

from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()

uploads = [
    (ROOT / "backend/app/Support/InflatedMemberCount.php", "backend/app/Support/InflatedMemberCount.php"),
    (ROOT / "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php", "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php"),
]

c = connect(env)
upload_files(c, uploads, env)
_, out, _ = c.exec_command(
    f"cd {backend_root(env)!s} && composer dump-autoload -o --no-interaction 2>&1 | tail -3 && supervisorctl restart bahram-horizon",
    timeout=120,
)
print(out.read().decode("utf-8", "replace"))
c.close()
