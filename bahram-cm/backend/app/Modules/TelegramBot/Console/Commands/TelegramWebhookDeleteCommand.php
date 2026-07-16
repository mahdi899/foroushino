<?php

namespace App\Modules\TelegramBot\Console\Commands;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\TelegramBotResolver;
use Illuminate\Console\Command;

class TelegramWebhookDeleteCommand extends Command
{
    protected $signature = 'telegram:webhook:delete {botKey=production} {--drop-pending}';

    protected $description = 'Delete Telegram webhook for the given bot key';

    public function handle(TelegramBotResolver $resolver, TelegramBotClientFactory $factory): int
    {
        $bot = $resolver->resolve((string) $this->argument('botKey'));
        $factory->forBot($bot)->deleteWebhook((bool) $this->option('drop-pending'));
        $this->info("Webhook deleted for {$bot->key}");

        return self::SUCCESS;
    }
}
