#!/usr/bin/env python3
"""Diagnose why /start is not replying."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== WEBHOOK CONTROLLER (sync?) ==='
grep -n 'dispatchSync\\|afterResponse\\|ProcessTelegramUpdateJob' app/Modules/TelegramBot/Http/Controllers/WebhookController.php

echo '=== OUTBOUND SYNC ENV ==='
grep TELEGRAM_OUTBOUND_SYNC .env || echo missing
php artisan tinker --execute="echo 'config_outbound_sync='.(config('telegram_bot.outbound_sync') ? 'true' : 'false').PHP_EOL;" 2>&1

echo '=== WEBHOOK INFO ==='
php artisan telegram:webhook:info production 2>&1 | head -20

echo '=== LAST 15 UPDATES ==='
php artisan tinker --execute="
\\$rows = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::orderByDesc('id')->limit(15)
  ->get(['id','update_id','update_type','status','received_at','processed_at','error_message']);
foreach (\\$rows as \\$r) {{
  echo \\$r->id.' uid='.\\$r->update_id.' '.\\$r->update_type->value.' '.\\$r->status->value
    .' recv='.\\$r->received_at
    .' err='.substr((string)(\\$r->error_message ?? ''),0,80).PHP_EOL;
}}
" 2>&1

echo '=== LIVE /start VIA WORKER ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$uid = 777100000 + random_int(1, 99999);
\\$payload = json_encode([
  'update_id' => \\$uid,
  'message' => [
    'message_id' => random_int(1000,9999),
    'from' => ['id' => 97343715, 'is_bot' => false, 'first_name' => 'Diag', 'username' => 'diag'],
    'chat' => ['id' => 97343715, 'type' => 'private'],
    'date' => time(),
    'text' => '/start',
  ],
]);
\\$t0 = microtime(true);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => \\$payload,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-Telegram-Bot-Api-Secret-Token: '.\\$secret],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 45,
]);
\\$body = curl_exec(\\$ch);
\\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE);
\\$err = curl_error(\\$ch);
curl_close(\\$ch);
echo 'http='.\\$code.' ms='.round((microtime(true)-\\$t0)*1000).' err='.\\$err.' body='.substr((string)\\$body,0,120).PHP_EOL;
\\$row = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id', \\$uid)->first();
if (\\$row) {{
  echo 'db_status='.\\$row->status->value.' err='.substr((string)(\\$row->error_message ?? ''),0,200).PHP_EOL;
}} else {{
  echo 'db_row=MISSING'.PHP_EOL;
}}
" 2>&1

echo '=== TELEGRAM LOG TAIL ==='
tail -40 storage/logs/telegram.log 2>/dev/null || echo no_telegram_log
echo '=== LARAVEL LOG TAIL ==='
tail -30 storage/logs/laravel.log 2>/dev/null | tail -30
"""

c = connect(env, timeout=180)
_, out, err = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e[-2000:])
c.close()
