<?php
require '/var/www/bahram-cm/backend/vendor/autoload.php';
$app = require '/var/www/bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $bot = app(App\Modules\TelegramBot\Services\BotResolver::class)->resolve('production');
    echo "bot_id={$bot->id}\n";
    $account = $bot->accounts()->where('telegram_user_id', 5244383790)->first();
    echo $account ? "account_found user_id={$account->user_id}\n" : "account_not_found\n";
} catch (Throwable $e) {
    echo 'error: '.$e->getMessage()."\n";
    echo $e->getFile().':'.$e->getLine()."\n";
}
