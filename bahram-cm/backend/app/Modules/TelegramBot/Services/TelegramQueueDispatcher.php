<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Jobs\ProcessBroadcastBatchJob;
use App\Modules\TelegramBot\Models\TelegramBroadcastBatch;

class TelegramQueueDispatcher
{
    public function dispatchBroadcastBatch(int $batchId): void
    {
        if (app()->environment('local') && ! app()->runningUnitTests()) {
            ProcessBroadcastBatchJob::dispatchSync($batchId);

            return;
        }

        ProcessBroadcastBatchJob::dispatch($batchId)
            ->onQueue((string) config('telegram_bot.queues.broadcast', 'telegram-broadcast'));
    }
}
