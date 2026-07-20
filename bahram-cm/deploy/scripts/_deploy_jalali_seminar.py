import sys
from pathlib import Path

from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()

uploads = [
    (ROOT / "backend/app/Support/JalaliDate.php", "backend/app/Support/JalaliDate.php"),
    (ROOT / "backend/app/Modules/TelegramBot/Services/TelegramContentPresenter.php", "backend/app/Modules/TelegramBot/Services/TelegramContentPresenter.php"),
]

c = connect(env)
upload_files(c, uploads, env)
be = backend_root(env)
_, out, _ = c.exec_command(
    f'cd {be} && composer dump-autoload -o --no-interaction 2>&1 | tail -2 && supervisorctl restart bahram-horizon && '
    f'php -r "require \'vendor/autoload.php\'; \\$app=require \'bootstrap/app.php\'; '
    f'\\$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); '
    f'echo App\\\\Support\\\\JalaliDate::formatDateTime(Carbon\\\\Carbon::parse(\'2026-07-24 19:46:00\',\'Asia/Tehran\')).PHP_EOL;"',
    timeout=120,
)
print(out.read().decode("utf-8", "replace"))
c.close()
