<?php

namespace App\Services\Messengers;

use App\Contracts\MessengerProviderContract;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Bale Messenger bot API adapter (https://tapi.bale.ai). Bale exposes a
 * Telegram-compatible Bot API, so this is a real, working driver once a bot
 * token is configured in the admin panel.
 */
class BaleMessengerProvider implements MessengerProviderContract
{
    private const BASE_URL = 'https://tapi.bale.ai/bot';

    public function __construct(private readonly MessengerSettingsService $settings) {}

    public function key(): string
    {
        return 'bale';
    }

    public function label(): string
    {
        return 'بله';
    }

    public function status(): string
    {
        return filled($this->settings->get($this->key())['token'] ?? null) ? 'available' : 'unavailable';
    }

    public function testConnection(): array
    {
        $token = $this->settings->get($this->key())['token'] ?? null;

        if (blank($token)) {
            return ['success' => false, 'message' => 'توکن ربات بله تنظیم نشده است.'];
        }

        try {
            $response = Http::timeout(15)->get(self::BASE_URL.$token.'/getMe');
        } catch (Throwable $e) {
            Log::channel('sms')->error('Bale connection test failed.', ['message' => $e->getMessage()]);

            return ['success' => false, 'message' => 'ارتباط با بله برقرار نشد.'];
        }

        if (! $response->successful() || ! data_get($response->json(), 'ok')) {
            return ['success' => false, 'message' => 'توکن ربات بله نامعتبر است.'];
        }

        return ['success' => true, 'message' => 'اتصال به بله با موفقیت برقرار شد.'];
    }

    public function send(string $chatId, string $message): array
    {
        $token = $this->settings->get($this->key())['token'] ?? null;

        if (blank($token)) {
            return ['success' => false, 'message' => 'سرویس بله در دسترس نیست (توکن تنظیم نشده).'];
        }

        try {
            $response = Http::timeout(15)->post(self::BASE_URL.$token.'/sendMessage', [
                'chat_id' => $chatId,
                'text' => $message,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Bale send failed.', ['message' => $e->getMessage(), 'chat_id' => $chatId]);

            return ['success' => false, 'message' => 'ارسال پیام بله ناموفق بود.'];
        }

        if (! $response->successful() || ! data_get($response->json(), 'ok')) {
            return ['success' => false, 'message' => 'ارسال پیام بله رد شد.'];
        }

        return ['success' => true, 'message' => 'پیام با موفقیت ارسال شد.'];
    }
}
