<?php

namespace App\Modules\TelegramBot\Console\Commands;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\TelegramBotResolver;
use Illuminate\Console\Command;

class TelegramWebhookInfoCommand extends Command
{
    protected $signature = 'telegram:webhook:info {botKey=production}';

    protected $description = 'Show Telegram webhook info';

    public function handle(TelegramBotResolver $resolver, TelegramBotClientFactory $factory): int
    {
        $bot = $resolver->resolve((string) $this->argument('botKey'));
        $info = $factory->forBot($bot)->getWebhookInfo();
        $this->line(json_encode($info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}
