<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\CaptchaService;
use Illuminate\Support\Facades\Cache;

echo 'driver='.config('cache.default').PHP_EOL;

try {
    Cache::put('captcha-test', 42, 60);
    $got = Cache::get('captcha-test');
    echo 'cache_put_get='.var_export($got, true).PHP_EOL;
} catch (Throwable $e) {
    echo 'cache_error='.$e->getMessage().PHP_EOL;
}

$captcha = app(CaptchaService::class);
$challenge = $captcha->createMathChallenge();
echo 'challenge_id='.$challenge['id'].PHP_EOL;
$key = 'captcha:math:'.$challenge['id'];
echo 'stored='.var_export(Cache::get($key), true).PHP_EOL;
