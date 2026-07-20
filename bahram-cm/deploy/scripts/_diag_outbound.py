"""Test outbound sendMessage via worker from production."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = """
cd """ + BE + """

php artisan tinker --execute="
$bot = App\\Modules\\TelegramBot\\Models\\TelegramBot::where('key','production')->first();
$factory = app(App\\Modules\\TelegramBot\\Clients\\TelegramBotClientFactory::class);
$client = $factory->forBot($bot);
$infra = app(App\\Services\\TelegramInfrastructureService::class);
echo 'uses_worker=' . ($infra->usesWorkerBridge() ? 'yes' : 'no') . PHP_EOL;
echo 'api_base=' . $infra->telegramApiBaseUrl() . PHP_EOL;
try {
  $me = $client->getMe();
  echo 'getMe_ok username=' . ($me['username'] ?? '?') . PHP_EOL;
} catch (Throwable $e) {
  echo 'getMe_FAIL ' . $e->getMessage() . PHP_EOL;
}
" 2>&1

echo '=== TEST sendMessage to admin ==='
php artisan tinker --execute="
$bot = App\\Modules\\TelegramBot\\Models\\TelegramBot::where('key','production')->first();
$factory = app(App\\Modules\\TelegramBot\\Clients\\TelegramBotClientFactory::class);
$client = $factory->forBot($bot);
try {
  $r = $client->sendMessage(97343715, '🔧 تست outbound — اگر این را می‌بینید ارسال پیام کار می‌کند.');
  echo 'send_ok message_id=' . ($r['message_id'] ?? '?') . PHP_EOL;
} catch (Throwable $e) {
  echo 'send_FAIL ' . $e->getMessage() . PHP_EOL;
}
" 2>&1

echo '=== FAILED JOBS ==='
php artisan queue:failed 2>&1 | head -20

echo '=== HORIZON SUPERVISORS ==='
php artisan horizon:status 2>&1
"""

c = connect(env)
chan = c.get_transport().open_session()
chan.settimeout(90)
chan.exec_command(cmds)
buf = b""
while True:
    if chan.recv_ready():
        buf += chan.recv(4096)
    elif chan.exit_status_ready():
        while chan.recv_ready():
            buf += chan.recv(4096)
        break
print(buf.decode("utf-8", "replace"))
c.close()
