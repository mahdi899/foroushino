<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\BotResolver;
use Illuminate\Console\Command;

class TelegramWebhookSetCommand extends Command
{
    protected $signature = 'telegram:webhook:set {botKey? : Bot key from config}';

    protected $description = 'Register the Telegram webhook URL for a bot';

    public function handle(BotResolver $resolver, TelegramBotClientFactory $clients): int
    {
        $botKey = (string) ($this->argument('botKey') ?? config('telegram_bot.default_bot_key', 'production'));
        $bot = $resolver->resolve($botKey);

        $base = rtrim((string) config('telegram_bot.webhook.base_url'), '/');
        $path = str_replace('{botKey}', $bot->key, (string) config('telegram_bot.webhook.path_pattern'));
        $url = $base.'/'.$path;

        $client = $clients->forBot($bot);
        $client->setWebhook($url, $bot->webhook_secret);

        $this->info("Webhook set for bot [{$bot->key}]: {$url}");

        return self::SUCCESS;
    }
}
