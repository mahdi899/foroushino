<?php

namespace App\Modules\TelegramBot\Console;

use App\Services\TelegramHostPushRetryService;
use Illuminate\Console\Command;

class TelegramHostPushRetryCommand extends Command
{
    protected $signature = 'telegram:host-push-retry';

    protected $description = 'Retry pending push sync to the external Telegram host';

    public function handle(TelegramHostPushRetryService $retry): int
    {
        $retry->retryPending();

        return self::SUCCESS;
    }
}
