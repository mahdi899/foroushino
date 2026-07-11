<?php

namespace App\Services\Sms\Providers;

use App\Contracts\SmsProviderContract;
use App\Services\Sms\SmsProviderConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * IPPanel REST adapter.
 * Credentials: API access key.
 *
 * @see https://ippanel.com
 */
class IppanelProvider implements SmsProviderContract
{
    private const DEFAULT_BASE = 'https://api2.ippanel.com';

    public function __construct(private readonly SmsProviderConfig $config) {}

    public function send(string $mobile, string $message): array
    {
        $apiKey = trim((string) $this->config->credentials);

        if ($apiKey === '') {
            return ['success' => false, 'message' => 'کلید API آی‌پی‌پنل تنظیم نشده است.', 'raw' => null];
        }

        if (filled($this->config->patternCode)) {
            return $this->sendPattern($apiKey, $mobile, $message);
        }

        try {
            $response = Http::timeout(20)
                ->withHeaders(['Authorization' => 'AccessKey '.$apiKey])
                ->post($this->config->resolvedBase(self::DEFAULT_BASE).'/api/v1/sms/send/webservice/single', [
                    'recipient' => [$this->normalizeMobile($mobile)],
                    'sender' => $this->config->senderNumber,
                    'message' => $message,
                ]);
        } catch (Throwable $e) {
            Log::channel('sms')->error('IPPanel request failed.', ['message' => $e->getMessage(), 'mobile' => $mobile]);

            return ['success' => false, 'message' => 'ارتباط با آی‌پی‌پنل برقرار نشد.', 'raw' => null];
        }

        if (! $response->successful()) {
            return ['success' => false, 'message' => 'ارسال توسط آی‌پی‌پنل رد شد.', 'raw' => $response->json()];
        }

        return ['success' => true, 'message' => 'ارسال موفق بود.', 'raw' => $response->json()];
    }

    public function testConnection(): array
    {
        if (blank($this->config->credentials)) {
            return ['success' => false, 'message' => 'کلید API آی‌پی‌پنل وارد نشده است.'];
        }

        return ['success' => true, 'message' => 'کلید API آی‌پی‌پنل ثبت شده است.'];
    }

  private function sendPattern(string $apiKey, string $mobile, string $message): array
    {
        try {
            $response = Http::timeout(20)
                ->withHeaders(['Authorization' => 'AccessKey '.$apiKey])
                ->post($this->config->resolvedBase(self::DEFAULT_BASE).'/api/v1/sms/pattern/send', [
                    'code' => $this->config->patternCode,
                    'recipient' => $this->normalizeMobile($mobile),
                    'variable' => ['message' => $message],
                ]);
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'ارسال پترن آی‌پی‌پنل ناموفق بود.', 'raw' => null];
        }

        if (! $response->successful()) {
            return ['success' => false, 'message' => 'پترن آی‌پی‌پنل رد شد.', 'raw' => $response->json()];
        }

        return ['success' => true, 'message' => 'ارسال پترن موفق بود.', 'raw' => $response->json()];
    }

    private function normalizeMobile(string $mobile): string
    {
        $digits = preg_replace('/\D+/', '', $mobile) ?? $mobile;

        if (str_starts_with($digits, '98')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '0')) {
            return '+98'.substr($digits, 1);
        }

        return '+98'.$digits;
    }
}
