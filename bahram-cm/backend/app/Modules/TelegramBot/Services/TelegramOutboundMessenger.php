<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Jobs\SendTelegramMessageJob;
use App\Modules\TelegramBot\Models\TelegramBot;

/**
 * Outbound Telegram messages. Default: queue on telegram-replies so inbound
 * workers finish quickly; sync only when the caller needs the API response.
 */
class TelegramOutboundMessenger
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
    ) {}

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>|null API result when $sync is true
     */
    public function reply(
        TelegramBot $bot,
        int|string $chatId,
        string $text,
        array $options = [],
        bool $sync = false,
    ): ?array {
        if ($sync || config('telegram_bot.outbound_sync', false)) {
            return $this->clients->forBot($bot)->sendMessage($chatId, $text, $options);
        }

        SendTelegramMessageJob::dispatch($bot->id, $chatId, $text, $options)
            ->onQueue((string) config('telegram_bot.queues.replies', 'telegram-replies'));

        return null;
    }
}
