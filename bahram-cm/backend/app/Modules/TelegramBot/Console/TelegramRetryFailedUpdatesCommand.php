<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use Illuminate\Console\Command;

class TelegramRetryFailedUpdatesCommand extends Command
{
    protected $signature = 'telegram:retry-failed-updates {--limit= : Batch size}';

    protected $description = 'Re-queue failed Telegram updates for processing';

    public function handle(TelegramUpdateRepository $updates): int
    {
        $limit = (int) ($this->option('limit') ?: config('telegram_bot.updates.retry_batch_size', 50));
        $batch = $updates->failedBatch($limit);

        foreach ($batch as $update) {
            $updates->resetToPending($update);
            ProcessTelegramUpdateJob::dispatch($update->id);
        }

        $this->info("Re-queued {$batch->count()} failed update(s).");

        return self::SUCCESS;
    }
}
