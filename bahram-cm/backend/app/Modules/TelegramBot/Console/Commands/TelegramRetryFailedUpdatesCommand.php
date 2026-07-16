<?php

namespace App\Modules\TelegramBot\Console\Commands;

use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use Illuminate\Console\Command;

class TelegramRetryFailedUpdatesCommand extends Command
{
    protected $signature = 'telegram:retry-failed-updates {--limit=50}';

    protected $description = 'Re-queue failed Telegram updates';

    public function handle(TelegramUpdateRepository $updates): int
    {
        $batch = $updates->failedBatch((int) $this->option('limit'));

        foreach ($batch as $update) {
            $updates->resetToPending($update);
            ProcessTelegramUpdateJob::dispatch($update->id)
                ->onQueue((string) config('telegram_bot.queues.inbound'));
        }

        $this->info('Queued '.$batch->count().' failed updates.');

        return self::SUCCESS;
    }
}
