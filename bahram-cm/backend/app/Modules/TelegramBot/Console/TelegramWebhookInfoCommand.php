<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\BotResolver;
use Illuminate\Console\Command;

class TelegramWebhookInfoCommand extends Command
{
    protected $signature = 'telegram:webhook:info {botKey? : Bot key from config}';

    protected $description = 'Show Telegram webhook info for a bot';

    public function handle(BotResolver $resolver, TelegramBotClientFactory $clients): int
    {
        $botKey = (string) ($this->argument('botKey') ?? config('telegram_bot.default_bot_key', 'production'));
        $bot = $resolver->resolve($botKey);

        $info = $clients->forBot($bot)->getWebhookInfo();

        $this->table(['Key', 'Value'], collect($info)->map(fn ($v, $k) => [$k, is_scalar($v) ? (string) $v : json_encode($v)])->values()->all());

        return self::SUCCESS;
    }
}
