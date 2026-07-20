"""Check admin conversation state on server."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
BE = backend_root(load_deploy_env())
c = connect(load_deploy_env())
_, out, _ = c.exec_command(f"""
cd {BE}
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$bot=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
foreach([97343715,303360676] as \\$uid){{
  \\$acc=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_bot_id',\\$bot->id)->where('telegram_user_id',\\$uid)->first();
  if(!\\$acc){{ echo \\$uid.' no account'.PHP_EOL; continue; }}
  \\$conv=App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class;
  \\$c=app(\\$conv)->forAccount(\\$acc);
  echo \\$uid.' state='.\\$c->state->value.' ctx='.json_encode(\\$c->context, JSON_UNESCAPED_UNICODE).PHP_EOL;
}}
"
""", timeout=30)
print(out.read().decode("utf-8", "replace"))
c.close()
