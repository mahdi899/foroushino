"""Check webhook secret in settings vs bot column."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}
php -r "
require 'vendor/autoload.php';
\\$a = require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$infra = app(App\\\\Services\\\\TelegramInfrastructureService::class);
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$settings = app(App\\\\Services\\\\SettingService::class)->group('telegram');
\\$infraArr = \\$settings['infrastructure'] ?? [];
echo 'infra_settings_secret_len=' . strlen(trim((string)(\\$infraArr['webhook_secret'] ?? ''))) . PHP_EOL;
echo 'infra_service_secret_len=' . strlen(trim((string)(\\$infra->webhookSecret() ?? ''))) . PHP_EOL;
echo 'bot_column_secret_len=' . strlen(trim((string)(\\$bot->webhook_secret ?? ''))) . PHP_EOL;
" 2>&1
"""

c = connect(env)
_, out, _ = c.exec_command(cmds, timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
