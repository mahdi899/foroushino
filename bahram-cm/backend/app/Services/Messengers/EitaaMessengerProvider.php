<?php

namespace App\Services\Messengers;

use App\Contracts\MessengerProviderContract;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Eitaa exposes a simple token-based "send by token" HTTP API for
 * channel/bot messages. Until a token is configured this driver reports
 * "unavailable" rather than failing loudly.
 */
class EitaaMessengerProvider implements MessengerProviderContract
{
    private const BASE_URL = 'https://eitaayar.ir/api';

    public function __construct(private readonly MessengerSettingsService $settings) {}

    public function key(): string
    {
        return 'eitaa';
    }

    public function label(): string
    {
        return 'ایتا';
    }

    public function status(): string
    {
        return filled($this->settings->get($this->key())['token'] ?? null) ? 'available' : 'unavailable';
    }

    public function testConnection(): array
    {
        $token = $this->settings->get($this->key())['token'] ?? null;

        if (blank($token)) {
            return ['success' => false, 'message' => 'توکن ایتایار تنظیم نشده است.'];
        }

        return ['success' => true, 'message' => 'توکن ایتایار ثبت شده است (اعتبارسنجی کامل در فاز بعدی).'];
    }

    public function send(string $chatId, string $message): array
    {
        $token = $this->settings->get($this->key())['token'] ?? null;

        if (blank($token)) {
            return ['success' => false, 'message' => 'سرویس ایتا در دسترس نیست (توکن تنظیم نشده).'];
        }

        try {
            $response = Http::timeout(15)->post(self::BASE_URL.'/'.$token, [
                'chat_id' => $chatId,
                'text' => $message,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Eitaa send failed.', ['message' => $e->getMessage(), 'chat_id' => $chatId]);

            return ['success' => false, 'message' => 'ارسال پیام ایتا ناموفق بود.'];
        }

        if (! $response->successful()) {
            return ['success' => false, 'message' => 'ارسال پیام ایتا رد شد.'];
        }

        return ['success' => true, 'message' => 'پیام با موفقیت ارسال شد.'];
    }
}
