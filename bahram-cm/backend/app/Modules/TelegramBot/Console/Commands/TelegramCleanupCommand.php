<?php

namespace App\Modules\TelegramBot\Console\Commands;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Models\TelegramLoginToken;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Illuminate\Console\Command;

class TelegramCleanupCommand extends Command
{
    protected $signature = 'telegram:cleanup';

    protected $description = 'Cleanup old Telegram updates and expired login tokens';

    public function handle(): int
    {
        $days = (int) config('telegram_bot.updates.retention_days', 30);

        $updates = TelegramUpdate::query()
            ->whereIn('status', [UpdateStatus::Processed, UpdateStatus::Skipped])
            ->where('created_at', '<', now()->subDays($days))
            ->delete();

        $tokens = TelegramLoginToken::query()
            ->where(function ($q): void {
                $q->whereNotNull('used_at')
                    ->orWhere('expires_at', '<', now());
            })
            ->where('created_at', '<', now()->subDays(7))
            ->delete();

        $this->info("Deleted {$updates} updates and {$tokens} login tokens.");

        return self::SUCCESS;
    }
}
