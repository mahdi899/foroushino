<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Models\TelegramLoginToken;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Illuminate\Console\Command;

class TelegramCleanupCommand extends Command
{
    protected $signature = 'telegram:cleanup';

    protected $description = 'Purge old processed Telegram updates and expired login tokens';

    public function handle(): int
    {
        $days = (int) config('telegram_bot.updates.retention_days', 30);
        $cutoff = now()->subDays($days);

        $updates = TelegramUpdate::query()
            ->whereIn('status', [UpdateStatus::Processed->value, UpdateStatus::Skipped->value])
            ->where('processed_at', '<', $cutoff)
            ->delete();

        $tokens = TelegramLoginToken::query()
            ->where('expires_at', '<', now()->subDay())
            ->delete();

        $this->info("Deleted {$updates} update(s) and {$tokens} login token(s).");

        return self::SUCCESS;
    }
}
