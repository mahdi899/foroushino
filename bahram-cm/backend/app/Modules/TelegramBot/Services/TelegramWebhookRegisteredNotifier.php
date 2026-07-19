<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Notifies the configured reports channel after a webhook is registered.
 */
class TelegramWebhookRegisteredNotifier
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function notify(TelegramBot $bot, string $webhookUrl, ?string $modeLabel = null): void
    {
        $chatId = $bot->paymentReportsChatId() ?: $bot->reportsGroupChatId();
        if (blank($chatId)) {
            return;
        }

        $client = $this->clients->forBot($bot);
        $username = $this->resolveBotUsername($client);

        $text = "✅ وب‌هوک ربات ثبت شد\n"
            ."────────────────\n"
            ."ربات: @{$username}\n";

        if (filled($modeLabel)) {
            $text .= "حالت: {$modeLabel}\n";
        }

        $text .= "آدرس:\n`{$webhookUrl}`";

        try {
            $client->sendMessage((string) $chatId, $text, ['parse_mode' => 'Markdown']);
        } catch (Throwable $e) {
            Log::warning('telegram_webhook_registered_notify_failed', [
                'bot_id' => $bot->id,
                'chat_id' => $chatId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveBotUsername(TelegramBotClientInterface $client): string
    {
        try {
            $me = $client->getMe();

            return (string) ($me['username'] ?? '?');
        } catch (Throwable) {
            return '?';
        }
    }
}
