<?php

namespace App\Modules\TelegramBot\Console\Commands;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Services\TelegramBotResolver;
use Illuminate\Console\Command;

class TelegramWebhookSetCommand extends Command
{
    protected $signature = 'telegram:webhook:set {botKey=production}';

    protected $description = 'Set Telegram webhook for the given bot key';

    public function handle(TelegramBotResolver $resolver, TelegramBotClientFactory $factory): int
    {
        $bot = $resolver->resolve((string) $this->argument('botKey'));
        $base = rtrim((string) config('telegram_bot.webhook.base_url'), '/');
        $url = $base.'/api/v1/integrations/telegram/'.$bot->key.'/webhook';
        $secret = (string) $bot->webhook_secret;

        $factory->forBot($bot)->setWebhook($url, $secret !== '' ? $secret : null, [
            'allowed_updates' => [
                'message', 'edited_message', 'callback_query',
                'my_chat_member', 'chat_member', 'chat_join_request',
            ],
        ]);

        $this->info("Webhook set for {$bot->key}: {$url}");

        return self::SUCCESS;
    }
}
