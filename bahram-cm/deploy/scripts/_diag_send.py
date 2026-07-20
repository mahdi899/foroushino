"""Get failed job details + test sendMessage."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

probe = ROOT / "backend" / "storage" / "app" / "_tg_probe.php"
probe.write_text("""<?php
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();

$bot = App\\Modules\\TelegramBot\\Models\\TelegramBot::where('key', 'production')->first();
$factory = app(App\\Modules\\TelegramBot\\Clients\\TelegramBotClientFactory::class);
$client = $factory->forBot($bot);
$infra = app(App\\Services\\TelegramInfrastructureService::class);

echo 'uses_worker=' . ($infra->usesWorkerBridge() ? 'yes' : 'no') . PHP_EOL;
echo 'api_base=' . $infra->telegramApiBaseUrl() . PHP_EOL;

try {
    $me = $client->getMe();
    echo 'getMe_ok @' . ($me['username'] ?? '?') . PHP_EOL;
} catch (Throwable $e) {
    echo 'getMe_FAIL: ' . $e->getMessage() . PHP_EOL;
}

$adminId = 97343715;
try {
    $r = $client->sendMessage($adminId, '🔧 تست outbound — اگر این را می‌بینید ارسال پیام کار می‌کند.');
    echo 'send_ok id=' . ($r['message_id'] ?? '?') . PHP_EOL;
} catch (Throwable $e) {
    echo 'send_FAIL: ' . $e->getMessage() . PHP_EOL;
}

$failed = Illuminate\\Support\\Facades\\DB::table('failed_jobs')->orderByDesc('id')->limit(3)->get();
foreach ($failed as $job) {
    echo '--- failed ' . $job->uuid . ' @ ' . $job->failed_at . PHP_EOL;
    echo substr($job->exception, 0, 400) . PHP_EOL;
}
""", encoding="utf-8")

c = connect(env)
upload_files(c, [(probe, "backend/storage/app/_tg_probe.php")], env)
_, out, _ = c.exec_command(f"cd {BE} && php storage/app/_tg_probe.php 2>&1", timeout=60)
print(out.read().decode("utf-8", "replace"))
c.exec_command(f"rm -f {BE}/storage/app/_tg_probe.php")
c.close()
probe.unlink(missing_ok=True)
