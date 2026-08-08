<?php
$root = '/var/www/bahram-cm';
require "{$root}/backend/vendor/autoload.php";
$app = require "{$root}/backend/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$s = app(App\Services\CacheIntegrationService::class)->publicSummary();
echo json_encode($s, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
