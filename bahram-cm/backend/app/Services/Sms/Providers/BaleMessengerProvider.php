<?php

namespace App\Services\Sms\Providers;

use App\Contracts\SmsProviderContract;
use App\Services\Sms\SmsProviderConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Bale messenger bot adapter.
 * Credentials: bot token.
 *
 * @see https://dev.bale.ai
 */
class BaleMessengerProvider implements SmsProviderContract
{
    private const DEFAULT_BASE = 'https://tapi.bale.ai';

    public function __construct(private readonly SmsProviderConfig $config) {}

    public function send(string $mobile, string $message): array
    {
        $token = trim((string) $this->config->credentials);

        if ($token === '') {
            return ['success' => false, 'message' => 'توکن ربات بله تنظیم نشده است.', 'raw' => null];
        }

        $chatId = $this->resolveChatId($mobile);

        if ($chatId === null) {
            return ['success' => false, 'message' => 'شناسه چت بله یافت نشد. شناسه چت را به‌جای موبایل وارد کنید.', 'raw' => null];
        }

        try {
            $response = Http::timeout(20)->post($this->botUrl('sendMessage'), [
                'chat_id' => $chatId,
                'text' => $message,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Bale send failed.', ['message' => $e->getMessage()]);

            return ['success' => false, 'message' => 'ارتباط با ربات بله برقرار نشد.', 'raw' => null];
        }

        $body = $response->json();

        if (! $response->successful() || data_get($body, 'ok') === false) {
            return ['success' => false, 'message' => 'ارسال پیام بله ناموفق بود.', 'raw' => $body];
        }

        return ['success' => true, 'message' => 'پیام بله ارسال شد.', 'raw' => $body];
    }

    public function testConnection(): array
    {
        $token = trim((string) $this->config->credentials);

        if ($token === '') {
            return ['success' => false, 'message' => 'توکن ربات بله وارد نشده است.'];
        }

        try {
            $response = Http::timeout(15)->get($this->botUrl('getMe'));
            $body = $response->json();

            if ($response->successful() && data_get($body, 'ok') === true) {
                return ['success' => true, 'message' => 'ربات بله: '.(string) data_get($body, 'result.username', 'متصل')];
            }
        } catch (Throwable) {
            //
        }

        return ['success' => false, 'message' => 'اتصال به ربات بله ناموفق بود.'];
    }

    private function resolveChatId(string $mobile): ?string
    {
        $digits = preg_replace('/\D+/', '', $mobile) ?? '';

        if ($digits === '') {
            return null;
        }

        // Bale chat_id is numeric; allow passing chat_id directly.
        if (strlen($digits) >= 5 && ! str_starts_with($digits, '09')) {
            return $digits;
        }

        return null;
    }

    private function botUrl(string $method): string
    {
        $token = trim((string) $this->config->credentials);

        return $this->config->resolvedBase(self::DEFAULT_BASE).'/bot'.$token.'/'.$method;
    }
}
