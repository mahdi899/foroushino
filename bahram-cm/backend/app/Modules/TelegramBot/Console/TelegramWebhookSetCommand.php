<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\BotResolver;
use App\Modules\TelegramBot\Services\TelegramWebhookRegisteredNotifier;
use App\Services\TelegramInfrastructureService;
use Illuminate\Console\Command;

class TelegramWebhookSetCommand extends Command
{
    protected $signature = 'telegram:webhook:set {botKey? : Bot key from config}';

    protected $description = 'Register the Telegram webhook URL for a bot';

    public function handle(
        BotResolver $resolver,
        TelegramBotClientFactory $clients,
        TelegramInfrastructureService $infrastructure,
        TelegramWebhookRegisteredNotifier $notifier,
    ): int {
        $botKey = (string) ($this->argument('botKey') ?? config('telegram_bot.default_bot_key', 'production'));
        $bot = $resolver->resolve($botKey);

        $url = $infrastructure->buildWebhookUrl($bot->key);

        $client = $clients->forBot($bot);
        $client->setWebhook($url, $bot->webhook_secret);

        $mode = $infrastructure->usesWorkerBridge() ? 'Cloudflare Worker' : 'مستقیم';
        $notifier->notify($bot, $url, $mode);

        $this->info("Webhook set for bot [{$bot->key}]: {$url}");

        return self::SUCCESS;
    }
}
