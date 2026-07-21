<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Exceptions\TelegramApiException;
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
        $shouldSync = $sync || config('telegram_bot.outbound_sync', false);

        if ($shouldSync) {
            try {
                return $this->clients->forBot($bot)->sendMessage($chatId, $text, $options);
            } catch (TelegramApiException $e) {
                if ($this->isTransportFailure($e)) {
                    SendTelegramMessageJob::dispatch($bot->id, $chatId, $text, $options)
                        ->onQueue((string) config('telegram_bot.queues.replies', 'telegram-replies'));

                    return null;
                }

                throw $e;
            }
        }

        SendTelegramMessageJob::dispatch($bot->id, $chatId, $text, $options)
            ->onQueue((string) config('telegram_bot.queues.replies', 'telegram-replies'));

        return null;
    }

    /**
     * Send a catalog banner. Prefer cached Telegram file_id in $photo.
     *
     * @param  array<string, mixed>  $options  caption, reply_markup, parse_mode, …
     * @return array<string, mixed>|null
     */
    public function replyPhoto(
        TelegramBot $bot,
        int|string $chatId,
        string $photo,
        array $options = [],
        bool $sync = true,
    ): ?array {
        $shouldSync = $sync || config('telegram_bot.outbound_sync', false);
        if (! $shouldSync) {
            // Photos need API result for file_id caching — send sync.
            $shouldSync = true;
        }

        try {
            return $this->clients->forBot($bot)->sendPhoto($chatId, $photo, $options);
        } catch (TelegramApiException $e) {
            // Caption/entity/photo errors must not abort the catalog — callers fall back to text.
            return null;
        }
    }

    /**
     * Optional welcome / mood sticker (file_id). Failures are swallowed.
     */
    public function replySticker(
        TelegramBot $bot,
        int|string $chatId,
        string $stickerFileId,
    ): void {
        $fileId = trim($stickerFileId);
        if ($fileId === '') {
            return;
        }

        try {
            $this->clients->forBot($bot)->sendSticker($chatId, $fileId);
        } catch (\Throwable) {
            // Invalid/expired sticker must not break the flow.
        }
    }

    private function isTransportFailure(TelegramApiException $e): bool
    {
        return str_contains($e->getMessage(), 'failed to reach the transport');
    }
}
