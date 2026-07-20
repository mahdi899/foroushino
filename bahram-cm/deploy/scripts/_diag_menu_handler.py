"""Test menu button handler end-to-end on server."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
BE = backend_root(load_deploy_env())
c = connect(load_deploy_env())

probe = ROOT / "backend" / "storage" / "app" / "_menu_probe.php"
probe.write_text(r"""<?php
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo 'OUTBOUND_SYNC=' . (config('telegram_bot.outbound_sync') ? 'true' : 'false') . PHP_EOL;

$bot = App\Modules\TelegramBot\Models\TelegramBot::where('key', 'production')->first();
$account = App\Modules\TelegramBot\Models\TelegramAccount::where('telegram_bot_id', $bot->id)
    ->where('telegram_user_id', 97343715)->first();

$handler = app(App\Modules\TelegramBot\Handlers\MessageHandler::class);
$catalog = app(App\Modules\TelegramBot\Services\TelegramProductCatalogService::class);
$products = $catalog->listPublicCourses();
echo 'products_count=' . $products->count() . PHP_EOL;

// Simulate update processing for menu button
$payload = [
    'update_id' => 888877901,
    'message' => [
        'message_id' => 99003,
        'from' => ['id' => 97343715, 'first_name' => 'Admin'],
        'chat' => ['id' => 97343715, 'type' => 'private'],
        'date' => time(),
        'text' => 'دوره کمپین نویسی 🎓',
    ],
];
$ingest = app(App\Modules\TelegramBot\Services\UpdateIngestService::class);
$update = $ingest->ingest($bot, $payload);
if (!$update) {
    echo "ingest duplicate\n";
    $update = App\Modules\TelegramBot\Models\TelegramUpdate::where('update_id', 888877901)->first();
}

config(['telegram_bot.outbound_sync' => true]);
try {
    app(App\Modules\TelegramBot\Services\UpdateRouter::class)->route($update->fresh(), $bot);
    echo 'route_ok status=' . $update->fresh()->status->value . PHP_EOL;
} catch (Throwable $e) {
    echo 'route_FAIL: ' . $e->getMessage() . PHP_EOL;
    echo substr($e->getTraceAsString(), 0, 500) . PHP_EOL;
}
""", encoding="utf-8")

upload_files(c, [(probe, "backend/storage/app/_menu_probe.php")], load_deploy_env())
_, out, _ = c.exec_command(f"cd {BE} && php storage/app/_menu_probe.php 2>&1", timeout=60)
print(out.read().decode("utf-8", "replace"))
c.exec_command(f"rm -f {BE}/storage/app/_menu_probe.php")
c.close()
probe.unlink(missing_ok=True)
