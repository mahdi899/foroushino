<?php
$root = getenv('APP_ROOT') ?: '/var/www/bahram-cm';
require "{$root}/backend/vendor/autoload.php";
$app = require "{$root}/backend/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$token = trim((string) (app(App\Services\CacheIntegrationService::class)->cloudflareApiToken() ?? ''));
file_put_contents('/tmp/cf_token.txt', $token);
echo strlen($token) . PHP_EOL;
