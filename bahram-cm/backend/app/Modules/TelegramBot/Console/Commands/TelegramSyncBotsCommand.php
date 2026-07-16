<?php

namespace App\Modules\TelegramBot\Console\Commands;

use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use Illuminate\Console\Command;

class TelegramSyncBotsCommand extends Command
{
    protected $signature = 'telegram:sync-bots';

    protected $description = 'Upsert telegram_bots rows from config';

    public function handle(TelegramBotRepository $bots): int
    {
        foreach ((array) config('telegram_bot.bots', []) as $configKey => $entry) {
            $key = (string) ($entry['key'] ?? $configKey);
            $bots->upsertFromConfig($key, $entry);
            $this->line("Synced bot: {$key}");
        }

        return self::SUCCESS;
    }
}
