<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Services\BotResolver;
use Illuminate\Console\Command;

class TelegramSyncBotsCommand extends Command
{
    protected $signature = 'telegram:sync-bots';

    protected $description = 'Sync telegram_bots table rows from config/telegram_bot.php';

    public function handle(BotResolver $resolver): int
    {
        $bots = $resolver->syncAllFromConfig();

        foreach ($bots as $bot) {
            $this->line("Synced bot [{$bot->key}] ({$bot->display_name})");
        }

        $this->info("Synced {$bots->count()} bot(s).");

        return self::SUCCESS;
    }
}
