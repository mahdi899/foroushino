<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\Cache::forget('telegram_host_push_failures');
\Illuminate\Support\Facades\Cache::forget('telegram_host_push_open_until');

$push = app(App\Services\TelegramHostPushService::class);

foreach (['refresh_bootstrap', 'refresh_catalog', 'refresh_all'] as $action) {
    $start = microtime(true);
    $ok = $push->runAction($action);
    $ms = round((microtime(true) - $start) * 1000);
    echo "action={$action} ok=" . ($ok ? 'true' : 'false') . " time={$ms}ms\n";
}
