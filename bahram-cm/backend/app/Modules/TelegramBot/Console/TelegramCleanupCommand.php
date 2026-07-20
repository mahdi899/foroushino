<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Models\TelegramLoginToken;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TelegramCleanupCommand extends Command
{
    protected $signature = 'telegram:cleanup
                            {--hours= : Override retention window in hours}';

    protected $description = 'Purge old Telegram update logs, delivery logs, and expired login tokens';

    public function handle(): int
    {
        $hours = (int) ($this->option('hours') ?: config('telegram_bot.updates.retention_hours', 24));
        $hours = max(1, $hours);
        $cutoff = now()->subHours($hours);
        $batchSize = min(max((int) config('telegram_bot.updates.cleanup_batch_size', 5000), 100), 10000);

        $updates = $this->deleteTelegramUpdates($cutoff, $batchSize);

        $deliveryLogs = 0;
        if (Schema::hasTable('telegram_delivery_logs')) {
            $deliveryHours = (int) config('telegram_bot.updates.delivery_log_retention_hours', $hours);
            $deliveryCutoff = now()->subHours(max(1, $deliveryHours));
            $deliveryLogs = $this->deleteDeliveryLogs($deliveryCutoff, $batchSize);
        }

        $tokens = TelegramLoginToken::query()
            ->where(function ($q): void {
                $q->whereNotNull('used_at')
                    ->orWhere('expires_at', '<', now());
            })
            ->where('created_at', '<', now()->subDay())
            ->limit($batchSize)
            ->delete();

        $this->info(sprintf(
            'Purged %d update(s), %d delivery log(s), %d login token(s) older than %d hour(s).',
            $updates,
            $deliveryLogs,
            $tokens,
            $hours,
        ));

        return self::SUCCESS;
    }

    private function deleteTelegramUpdates(\DateTimeInterface $cutoff, int $batchSize): int
    {
        $deleted = 0;

        do {
            $ids = TelegramUpdate::query()
                ->whereIn('status', [
                    UpdateStatus::Processed,
                    UpdateStatus::Skipped,
                    UpdateStatus::Failed,
                    UpdateStatus::Pending,
                    UpdateStatus::Processing,
                ])
                ->where('received_at', '<', $cutoff)
                ->orderBy('id')
                ->limit($batchSize)
                ->pluck('id');

            if ($ids->isEmpty()) {
                break;
            }

            $count = TelegramUpdate::query()->whereIn('id', $ids)->delete();
            $deleted += $count;
        } while ($count >= $batchSize);

        return $deleted;
    }

    private function deleteDeliveryLogs(\DateTimeInterface $cutoff, int $batchSize): int
    {
        $deleted = 0;

        do {
            $ids = DB::table('telegram_delivery_logs')
                ->where('created_at', '<', $cutoff)
                ->orderBy('id')
                ->limit($batchSize)
                ->pluck('id');

            if ($ids->isEmpty()) {
                break;
            }

            $count = DB::table('telegram_delivery_logs')->whereIn('id', $ids)->delete();
            $deleted += $count;
        } while ($count >= $batchSize);

        return $deleted;
    }
}
