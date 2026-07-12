<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo json_encode((new App\Services\Sat\SatOutboundSyncService())->testConnection(), JSON_UNESCAPED_UNICODE).PHP_EOL;
