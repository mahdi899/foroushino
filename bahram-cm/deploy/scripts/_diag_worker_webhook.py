"""Test webhook through Cloudflare worker path."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$payload = json_encode(['update_id'=>888877930,'message'=>['message_id'=>1,'from'=>['id'=>97343715],'chat'=>['id'=>97343715,'type'=>'private'],'date'=>time(),'text'=>'/start']]);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => \\$payload,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'X-Telegram-Bot-Api-Secret-Token: '.\\$secret,
  ],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 20,
]);
\\$body = curl_exec(\\$ch);
\\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE);
curl_close(\\$ch);
echo 'worker_http='.\\$code.' body='.substr((string)\\$body,0,200).PHP_EOL;

// duplicate same update_id — worker should still forward if dedupe not deployed, or skip if deployed after 200
\\$ch2 = curl_init(\\$url);
curl_setopt_array(\\$ch2, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => \\$payload,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'X-Telegram-Bot-Api-Secret-Token: '.\\$secret,
  ],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 20,
]);
\\$body2 = curl_exec(\\$ch2);
\\$code2 = curl_getinfo(\\$ch2, CURLINFO_HTTP_CODE);
curl_close(\\$ch2);
echo 'worker_dup_http='.\\$code2.' body='.substr((string)\\$body2,0,200).PHP_EOL;
" 2>&1

grep TELEGRAM_OUTBOUND_SYNC .env
"""

c = connect(env, timeout=60)
_, out, _ = c.exec_command(cmds, timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
