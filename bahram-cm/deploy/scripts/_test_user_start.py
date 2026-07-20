"""Simulate /start for real user and check send."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$infra = app(App\\\\Services\\\\TelegramInfrastructureService::class);
echo 'uses_worker='.(\\$infra->usesWorkerBridge()?'yes':'no').PHP_EOL;
echo 'api_base='.\\$infra->telegramApiBaseUrl().PHP_EOL;
echo 'panel_base='.\\$infra->panelBaseUrl().PHP_EOL;

\\$acc = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_bot_id',\\$bot->id)->where('telegram_user_id',5244383790)->first();
\\$conv = app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class)->forAccount(\\$acc);
try {{
  app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\RegistrationFlowService::class)->start(\\$bot, \\$acc, \\$conv);
  echo 'start() ok'.PHP_EOL;
}} catch(Throwable \\$e) {{ echo 'start err: '.\\$e->getMessage().PHP_EOL; }}

try {{
  \\$r = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot)->sendMessage(5244383790, '🧪 direct send test '.date('H:i:s'));
  echo 'direct msg_id='.(\\$r['message_id']??'?').PHP_EOL;
}} catch(Throwable \\$e) {{ echo 'send err: '.\\$e->getMessage().PHP_EOL; }}
" 2>&1
"""

c = connect(env, timeout=60)
_, out, _ = c.exec_command(cmds, timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
