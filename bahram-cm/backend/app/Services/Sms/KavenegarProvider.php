<?php

namespace App\Services\Sms;

use App\Contracts\SmsProviderContract;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Adapter around the Kavenegar SMS API.
 */
class KavenegarProvider implements SmsProviderContract
{
    public function __construct(private readonly SmsProviderConfig $config) {}

    public function send(string $mobile, string $message): array
    {
        $apiKey = (string) $this->config->credentials;

        if (blank($apiKey)) {
            return ['success' => false, 'message' => 'کلید API کاوه‌نگار تنظیم نشده است.', 'raw' => null];
        }

        try {
            $response = Http::timeout(20)->get("https://api.kavenegar.com/v1/{$apiKey}/sms/send.json", array_filter([
                'receptor' => $mobile,
                'sender' => $this->config->senderNumber,
                'message' => $message,
            ]));
        } catch (Throwable $e) {
            Log::channel('sms')->error('Kavenegar request could not be sent.', ['message' => $e->getMessage(), 'mobile' => $mobile]);

            return ['success' => false, 'message' => 'ارتباط با کاوه‌نگار برقرار نشد.', 'raw' => null];
        }

        $body = $response->json();
        $status = data_get($body, 'return.status');

        if ((int) $status !== 200) {
            Log::channel('sms')->error('Kavenegar rejected the message.', ['mobile' => $mobile, 'response' => $body]);

            return ['success' => false, 'message' => 'ارسال پیامک توسط کاوه‌نگار رد شد.', 'raw' => $body];
        }

        return ['success' => true, 'message' => 'ارسال موفق بود.', 'raw' => $body];
    }

    public function testConnection(): array
    {
        if (blank($this->config->credentials)) {
            return ['success' => false, 'message' => 'کلید API کاوه‌نگار وارد نشده است.'];
        }

        return ['success' => true, 'message' => 'کلید API کاوه‌نگار ثبت شده است.'];
    }
}
