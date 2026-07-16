<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\BotResolver;
use Illuminate\Console\Command;

class TelegramWebhookDeleteCommand extends Command
{
    protected $signature = 'telegram:webhook:delete {botKey? : Bot key from config} {--drop-pending : Drop pending updates}';

    protected $description = 'Delete the Telegram webhook for a bot';

    public function handle(BotResolver $resolver, TelegramBotClientFactory $clients): int
    {
        $botKey = (string) ($this->argument('botKey') ?? config('telegram_bot.default_bot_key', 'production'));
        $bot = $resolver->resolve($botKey);

        $clients->forBot($bot)->deleteWebhook((bool) $this->option('drop-pending'));

        $this->info("Webhook deleted for bot [{$bot->key}].");

        return self::SUCCESS;
    }
}
