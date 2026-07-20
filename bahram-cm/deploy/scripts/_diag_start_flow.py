"""Full /start flow probe on production."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

probe = ROOT / "backend" / "storage" / "app" / "_tg_start_probe.php"
probe.write_text(r"""<?php
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

config(['queue.default' => 'sync']);

$bot = App\Modules\TelegramBot\Models\TelegramBot::where('key', 'production')->first();
$factory = app(App\Modules\TelegramBot\Clients\TelegramBotClientFactory::class);

foreach ([97343715, 303360676] as $uid) {
    $account = App\Modules\TelegramBot\Models\TelegramAccount::where('telegram_bot_id', $bot->id)
        ->where('telegram_user_id', $uid)->first();
    echo "=== user $uid ===" . PHP_EOL;
    if (!$account) {
        echo "no account row" . PHP_EOL;
        continue;
    }
    echo 'linked=' . ($account->isLinked() ? 'yes' : 'no') . ' mobile=' . ($account->hasVerifiedMobile() ? 'yes' : 'no') . ' admin=' . ($account->isBotAdmin() ? 'yes' : 'no') . PHP_EOL;

    $conversation = app(App\Modules\TelegramBot\Services\ConversationService::class)->forAccount($account);
    try {
        app(App\Modules\TelegramBot\Services\RegistrationFlowService::class)->start($bot, $account, $conversation);
        echo "start() ok (sync queue)" . PHP_EOL;
    } catch (Throwable $e) {
        echo 'start_FAIL: ' . $e->getMessage() . PHP_EOL;
    }
}

$failedReplies = Illuminate\Support\Facades\DB::table('failed_jobs')
    ->where('queue', 'telegram-replies')
    ->orderByDesc('id')->limit(5)->get();
echo 'failed_replies_count=' . $failedReplies->count() . PHP_EOL;
foreach ($failedReplies as $job) {
    echo substr($job->exception, 0, 250) . PHP_EOL;
}
""", encoding="utf-8")

c = connect(env)
upload_files(c, [(probe, "backend/storage/app/_tg_start_probe.php")], env)
_, out, _ = c.exec_command(f"cd {BE} && php storage/app/_tg_start_probe.php 2>&1", timeout=60)
print(out.read().decode("utf-8", "replace"))
c.exec_command(f"rm -f {BE}/storage/app/_tg_start_probe.php")
c.close()
probe.unlink(missing_ok=True)
