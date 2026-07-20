"""Check webhook URL and recent ingest source."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
BE = backend_root(env := load_deploy_env())

c = connect(env)
_, out, _ = c.exec_command(f"""
cd {BE}
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$bot=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$info=app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot)->getWebhookInfo();
echo json_encode(\\$info, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
echo 'expected='.app(App\\\\Services\\\\TelegramInfrastructureService::class)->buildWebhookUrl('production').PHP_EOL;
"
""", timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
