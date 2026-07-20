import sys
from pathlib import Path

from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()

uploads = [
    (ROOT / "backend/app/Services/ReferralService.php", "backend/app/Services/ReferralService.php"),
    (ROOT / "backend/app/Http/Controllers/Api/V1/Student/ReferralController.php", "backend/app/Http/Controllers/Api/V1/Student/ReferralController.php"),
    (ROOT / "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php", "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php"),
]

c = connect(env)
upload_files(c, uploads, env)
be = backend_root(env)
_, out, _ = c.exec_command(
    f'cd {be} && composer dump-autoload -o --no-interaction 2>&1 | tail -2 && supervisorctl restart bahram-horizon && '
    f'php -r "require \'vendor/autoload.php\'; \\$app=require \'bootstrap/app.php\'; '
    f'\\$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); '
    f'echo (new App\\\\Services\\\\ReferralService)->referralLink(\'BRM-20449\').PHP_EOL;"',
    timeout=120,
)
print(out.read().decode("utf-8", "replace"))
c.close()
