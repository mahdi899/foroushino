<?php

namespace App\Services\Sms\Providers;

use App\Contracts\SmsProviderContract;
use App\Services\Sms\SmsProviderConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Telegram bot adapter.
 * Credentials: bot token.
 */
class TelegramMessengerProvider implements SmsProviderContract
{
    public function __construct(private readonly SmsProviderConfig $config) {}

    public function send(string $mobile, string $message): array
    {
        $token = trim((string) $this->config->credentials);

        if ($token === '') {
            return ['success' => false, 'message' => 'توکن ربات تلگرام تنظیم نشده است.', 'raw' => null];
        }

        $chatId = $this->resolveChatId($mobile);

        if ($chatId === null) {
            return ['success' => false, 'message' => 'شناسه چت تلگرام یافت نشد. chat_id را به‌جای موبایل وارد کنید.', 'raw' => null];
        }

        try {
            $response = Http::timeout(20)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $message,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Telegram send failed.', ['message' => $e->getMessage()]);

            return ['success' => false, 'message' => 'ارتباط با ربات تلگرام برقرار نشد.', 'raw' => null];
        }

        $body = $response->json();

        if (! $response->successful() || data_get($body, 'ok') !== true) {
            return ['success' => false, 'message' => 'ارسال پیام تلگرام ناموفق بود.', 'raw' => $body];
        }

        return ['success' => true, 'message' => 'پیام تلگرام ارسال شد.', 'raw' => $body];
    }

    public function testConnection(): array
    {
        $token = trim((string) $this->config->credentials);

        if ($token === '') {
            return ['success' => false, 'message' => 'توکن ربات تلگرام وارد نشده است.'];
        }

        try {
            $response = Http::timeout(15)->get("https://api.telegram.org/bot{$token}/getMe");
            $body = $response->json();

            if ($response->successful() && data_get($body, 'ok') === true) {
                return ['success' => true, 'message' => 'ربات تلگرام: @'.(string) data_get($body, 'result.username', 'متصل')];
            }
        } catch (Throwable) {
            //
        }

        return ['success' => false, 'message' => 'اتصال به ربات تلگرام ناموفق بود.'];
    }

    private function resolveChatId(string $mobile): ?string
    {
        $digits = preg_replace('/\D+/', '', $mobile) ?? '';

        if ($digits === '') {
            return null;
        }

        if (strlen($digits) >= 5 && ! str_starts_with($digits, '09')) {
            return $digits;
        }

        return null;
    }
}
