<?php

namespace App\Services\Sms\Providers;

use App\Contracts\SmsProviderContract;
use App\Services\Sms\SmsProviderConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Bale Safir (سفیر) REST adapter for OTP and text messages.
 *
 * @see https://docs.bale.ai/safir
 */
class BaleSafirProvider implements SmsProviderContract
{
    private const DEFAULT_BASE = 'https://safir.bale.ai';

    public function __construct(private readonly SmsProviderConfig $config) {}

    public function send(string $mobile, string $message): array
    {
        $apiKey = trim((string) $this->config->credentials);
        $botId = $this->resolveBotId();

        if ($apiKey === '') {
            return ['success' => false, 'message' => 'کلید API سفیر بله تنظیم نشده است.', 'raw' => null];
        }

        if ($botId === null) {
            return ['success' => false, 'message' => 'شناسه بازو (bot_id) سفیر بله تنظیم نشده است.', 'raw' => null];
        }

        $phone = $this->toSafirPhone($mobile);

        if ($phone === null) {
            return ['success' => false, 'message' => 'شماره موبایل برای سفیر بله نامعتبر است.', 'raw' => null];
        }

        $otp = $this->extractOtpCode($message);
        $messageData = $otp !== null
            ? ['otp_message' => ['otp' => $otp]]
            : ['message' => ['text' => $message]];

        try {
            $response = Http::timeout(20)
                ->withHeaders([
                    'api-access-key' => $apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->config->resolvedBase(self::DEFAULT_BASE).'/api/v3/send_message', [
                    'request_id' => (string) Str::uuid(),
                    'bot_id' => $botId,
                    'phone_number' => $phone,
                    'message_data' => $messageData,
                ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Bale Safir send failed.', [
                'message' => $e->getMessage(),
                'mobile' => $mobile,
            ]);

            return ['success' => false, 'message' => 'ارتباط با سفیر بله برقرار نشد.', 'raw' => null];
        }

        $body = $response->json();
        $errorData = data_get($body, 'error_data');

        if (! $response->successful() || (is_array($errorData) && $errorData !== [])) {
            $description = is_array($errorData)
                ? (string) data_get($errorData, '0.description', data_get($errorData, 'description', ''))
                : '';

            return [
                'success' => false,
                'message' => $description !== '' ? $description : 'ارسال پیام سفیر بله ناموفق بود.',
                'raw' => $body,
            ];
        }

        if (blank(data_get($body, 'message_id'))) {
            return ['success' => false, 'message' => 'پاسخ نامعتبر از سفیر بله.', 'raw' => $body];
        }

        return ['success' => true, 'message' => 'پیام سفیر بله ارسال شد.', 'raw' => $body];
    }

    public function testConnection(): array
    {
        $apiKey = trim((string) $this->config->credentials);

        if ($apiKey === '') {
            return ['success' => false, 'message' => 'کلید API سفیر بله وارد نشده است.'];
        }

        if ($this->resolveBotId() === null) {
            return ['success' => false, 'message' => 'شناسه بازو (bot_id) سفیر بله وارد نشده است.'];
        }

        return ['success' => true, 'message' => 'تنظیمات سفیر بله ثبت شده است.'];
    }

    private function resolveBotId(): ?int
    {
        $raw = trim((string) $this->config->senderNumber);

        if ($raw === '' || ! ctype_digit($raw)) {
            return null;
        }

        return (int) $raw;
    }

    private function toSafirPhone(string $mobile): ?string
    {
        $digits = preg_replace('/\D/', '', $mobile) ?? '';

        if (str_starts_with($digits, '09') && strlen($digits) === 11) {
            return '98'.substr($digits, 1);
        }

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return $digits;
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '98'.$digits;
        }

        return null;
    }

    private function extractOtpCode(string $message): ?string
    {
        if (preg_match('/\b(\d{5})\b/', $message, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }
}
