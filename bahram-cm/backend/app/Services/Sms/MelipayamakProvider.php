<?php

namespace App\Services\Sms;

use App\Contracts\SmsProviderContract;
use App\Models\SmsSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Adapter around the Melipayamak REST SMS API
 * (https://www.melipayamak.com/api/). Credentials are stored as
 * "username:password" in `sms_settings.sms_api_key` (encrypted at rest).
 */
class MelipayamakProvider implements SmsProviderContract
{
    private const ENDPOINT = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';

    public function __construct(private readonly SmsSetting $settings) {}

    public function send(string $mobile, string $message): array
    {
        $credentials = $this->credentials();

        if (! $credentials) {
            return ['success' => false, 'message' => 'اطلاعات ورود ملی‌پیامک تنظیم نشده است.', 'raw' => null];
        }

        [$username, $password] = $credentials;

        try {
            $response = Http::timeout(20)->asForm()->post(self::ENDPOINT, [
                'username' => $username,
                'password' => $password,
                'to' => $mobile,
                'from' => $this->settings->sms_sender_number,
                'text' => $message,
                'isflash' => false,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Melipayamak request could not be sent.', ['message' => $e->getMessage(), 'mobile' => $mobile]);

            return ['success' => false, 'message' => 'ارتباط با ملی‌پیامک برقرار نشد.', 'raw' => null];
        }

        $body = $response->json();
        // Melipayamak returns a numeric RetStatus (1 = success) plus a Value (message id).
        $retStatus = data_get($body, 'RetStatus');

        if ((int) $retStatus !== 1) {
            Log::channel('sms')->error('Melipayamak rejected the message.', ['mobile' => $mobile, 'response' => $body]);

            return ['success' => false, 'message' => 'ارسال پیامک توسط ملی‌پیامک رد شد.', 'raw' => $body];
        }

        return ['success' => true, 'message' => 'ارسال موفق بود.', 'raw' => $body];
    }

    public function testConnection(): array
    {
        if (! $this->credentials()) {
            return ['success' => false, 'message' => 'نام کاربری/رمز عبور ملی‌پیامک وارد نشده است.'];
        }

        return ['success' => true, 'message' => 'اطلاعات ورود ملی‌پیامک ثبت شده است.'];
    }

    /** @return array{0: string, 1: string}|null */
    private function credentials(): ?array
    {
        $raw = (string) $this->settings->sms_api_key;

        if (blank($raw) || ! str_contains($raw, ':')) {
            return null;
        }

        [$username, $password] = explode(':', $raw, 2);

        if (blank($username) || blank($password)) {
            return null;
        }

        return [$username, $password];
    }
}
