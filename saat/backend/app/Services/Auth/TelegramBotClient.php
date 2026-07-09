<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class TelegramBotClient
{
    public function sendMessage(int|string $chatId, string $text): void
    {
        $token = (string) config('telegram.bot_token');
        if ($token === '') {
            throw new RuntimeException('توکن ربات تلگرام تنظیم نشده است.');
        }

        $response = Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
        ]);

        if (! $response->ok() || ! ($response->json('ok') ?? false)) {
            throw new RuntimeException('ارسال پیام تلگرام ناموفق بود.');
        }
    }
}
