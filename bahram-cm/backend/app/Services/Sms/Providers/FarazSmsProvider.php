<?php

namespace App\Services\Sms\Providers;

use App\Contracts\SmsProviderContract;
use App\Services\Sms\SmsProviderConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Faraz SMS (فراز اس‌ام‌اس) REST adapter.
 * Credentials: API key string.
 *
 * @see https://farazsms.com
 */
class FarazSmsProvider implements SmsProviderContract
{
    private const DEFAULT_BASE = 'https://api.farazsms.com';

    public function __construct(private readonly SmsProviderConfig $config) {}

    public function send(string $mobile, string $message): array
    {
        $apiKey = trim((string) $this->config->credentials);

        if ($apiKey === '') {
            return ['success' => false, 'message' => 'کلید API فراز اس‌ام‌اس تنظیم نشده است.', 'raw' => null];
        }

        try {
            $response = Http::timeout(20)
                ->withToken($apiKey)
                ->post($this->config->resolvedBase(self::DEFAULT_BASE).'/v1/sms/send', [
                    'recipient' => $mobile,
                    'sender' => $this->config->senderNumber,
                    'message' => $message,
                ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Faraz SMS request failed.', ['message' => $e->getMessage(), 'mobile' => $mobile]);

            return ['success' => false, 'message' => 'ارتباط با فراز اس‌ام‌اس برقرار نشد.', 'raw' => null];
        }

        if (! $response->successful()) {
            return ['success' => false, 'message' => 'ارسال توسط فراز اس‌ام‌اس رد شد.', 'raw' => $response->json()];
        }

        return ['success' => true, 'message' => 'ارسال موفق بود.', 'raw' => $response->json()];
    }

    public function testConnection(): array
    {
        if (blank($this->config->credentials)) {
            return ['success' => false, 'message' => 'کلید API فراز اس‌ام‌اس وارد نشده است.'];
        }

        return ['success' => true, 'message' => 'کلید API فراز اس‌ام‌اس ثبت شده است.'];
    }
}
