from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
c = connect(env, timeout=60)
cmds = f"""
cd {BE}
php artisan queue:clear redis --queue=telegram-inbound --force 2>&1
php artisan queue:clear redis --queue=telegram-replies --force 2>&1
php artisan queue:clear redis --queue=default --force 2>&1
php artisan tinker --execute="
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first());
\\$r = \\$c->sendMessage(5244383790, '✅ همه fixها روی سرور اعمال شد — '.date('H:i:s'));
echo 'msg_id='.(\\$r['message_id'] ?? '?').PHP_EOL;
" 2>&1
"""
_, out, _ = c.exec_command(cmds, timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
