<?php

namespace App\Services\Sms;

use App\Contracts\SmsProviderContract;
use App\Services\Sms\SmsProviderConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Adapter around the Melipayamak REST SMS API.
 * Credentials: "username:password"
 *
 * @see https://www.melipayamak.com/api
 */
class MelipayamakProvider implements SmsProviderContract
{
    private const SEND_ENDPOINT = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';
    private const PATTERN_ENDPOINT = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber';

    public function __construct(private readonly SmsProviderConfig $config) {}

    public function send(string $mobile, string $message): array
    {
        $credentials = $this->credentials();

        if (! $credentials) {
            return ['success' => false, 'message' => 'اطلاعات ورود ملی‌پیامک تنظیم نشده است.', 'raw' => null];
        }

        if (filled($this->config->patternCode)) {
            return $this->sendPattern($credentials, $mobile, $message);
        }

        [$username, $password] = $credentials;

        try {
            $response = Http::timeout(20)->asForm()->post(self::SEND_ENDPOINT, [
                'username' => $username,
                'password' => $password,
                'to' => $mobile,
                'from' => $this->config->senderNumber,
                'text' => $message,
                'isflash' => false,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Melipayamak request could not be sent.', ['message' => $e->getMessage(), 'mobile' => $mobile]);

            return ['success' => false, 'message' => 'ارتباط با ملی‌پیامک برقرار نشد.', 'raw' => null];
        }

        return $this->parseResponse($response->json(), $mobile);
    }

    public function testConnection(): array
    {
        if (! $this->credentials()) {
            return ['success' => false, 'message' => 'نام کاربری/رمز عبور ملی‌پیامک وارد نشده است.'];
        }

        return ['success' => true, 'message' => 'اطلاعات ورود ملی‌پیامک ثبت شده است.'];
    }

    /** @param  array{0: string, 1: string}  $credentials */
    private function sendPattern(array $credentials, string $mobile, string $message): array
    {
        [$username, $password] = $credentials;

        try {
            $response = Http::timeout(20)->asForm()->post(self::PATTERN_ENDPOINT, [
                'username' => $username,
                'password' => $password,
                'to' => $mobile,
                'bodyId' => (int) $this->config->patternCode,
                'text' => $message,
            ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('Melipayamak pattern request failed.', ['mobile' => $mobile, 'message' => $e->getMessage()]);

            return ['success' => false, 'message' => 'ارسال پترن ملی‌پیامک ناموفق بود.', 'raw' => null];
        }

        return $this->parseResponse($response->json(), $mobile);
    }

    /** @return array{success: bool, message: string, raw: mixed} */
    private function parseResponse(mixed $body, string $mobile): array
    {
        $retStatus = data_get($body, 'RetStatus');

        if ((int) $retStatus !== 1) {
            Log::channel('sms')->error('Melipayamak rejected the message.', ['mobile' => $mobile, 'response' => $body]);

            return ['success' => false, 'message' => 'ارسال پیامک توسط ملی‌پیامک رد شد.', 'raw' => $body];
        }

        return ['success' => true, 'message' => 'ارسال موفق بود.', 'raw' => $body];
    }

    /** @return array{0: string, 1: string}|null */
    private function credentials(): ?array
    {
        $raw = (string) $this->config->credentials;

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
