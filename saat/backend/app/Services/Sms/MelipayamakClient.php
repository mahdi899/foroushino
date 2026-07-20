<?php

namespace App\Services\Sms;

use App\Models\AppSetting;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MelipayamakClient
{
    /**
     * @param  list<string>  $variables
     */
    public function sendByBaseNumber(string $to, int $bodyId, array $variables): string
    {
        $config = $this->resolveConfig();

        if ($config['username'] === '' || $config['password'] === '') {
            throw new RuntimeException('نام کاربری یا رمز ملی پیامک در پنل مدیریت تنظیم نشده است.');
        }

        if ($bodyId <= 0) {
            throw new RuntimeException('کد پترن ملی پیامک معتبر نیست.');
        }

        $text = implode(';', array_map(
            fn (string $value) => str_replace(';', ' ', $value),
            $variables,
        ));

        $response = $this->post($config['rest_url'], 'BaseServiceNumber', [
            'username' => $config['username'],
            'password' => $config['password'],
            'to' => $this->normalizePhone($to),
            'bodyId' => $bodyId,
            'text' => $text,
        ]);

        return $this->parseSendResponse($response);
    }

    /**
     * @return array{ok: bool, message: string, credit?: float}
     */
    public function probeCredentials(?string $username = null, ?string $password = null, ?string $restUrl = null): array
    {
        $config = $this->resolveConfig($username, $password, $restUrl);

        if ($config['username'] === '' || $config['password'] === '') {
            return [
                'ok' => false,
                'message' => 'نام کاربری و رمز پنل ملی‌پیامک را وارد کنید.',
            ];
        }

        $response = $this->post($config['rest_url'], 'GetCredit', [
            'username' => $config['username'],
            'password' => $config['password'],
        ]);

        if (! $response->ok()) {
            return [
                'ok' => false,
                'message' => 'ارتباط با سرور ملی‌پیامک برقرار نشد.',
            ];
        }

        $body = $response->json();
        $value = is_array($body) ? ($body['Value'] ?? $body['value'] ?? null) : null;

        if (is_numeric($value) && (float) $value < 0) {
            return [
                'ok' => false,
                'message' => $this->errorMessage((string) (int) $value),
            ];
        }

        if (! is_numeric($value)) {
            return [
                'ok' => false,
                'message' => 'پاسخ نامعتبر از ملی‌پیامک دریافت شد.',
            ];
        }

        return [
            'ok' => true,
            'message' => 'اتصال به پنل ملی‌پیامک برقرار است.',
            'credit' => (float) $value,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function post(string $restUrl, string $method, array $payload): Response
    {
        return Http::timeout(20)
            ->asForm()
            ->post($this->apiUrl($restUrl, $method), $payload);
    }

    private function apiUrl(string $restUrl, string $method): string
    {
        $base = rtrim($restUrl, '/');
        $base = preg_replace('#/(SendByBaseNumber|BaseServiceNumber|GetCredit)$#', '', $base) ?? $base;

        return $base.'/'.$method;
    }

    private function parseSendResponse(Response $response): string
    {
        if (! $response->ok()) {
            throw new RuntimeException('ارتباط با ملی پیامک برقرار نشد.');
        }

        $body = $response->json();

        if (! is_array($body)) {
            throw new RuntimeException('پاسخ نامعتبر از ملی‌پیامک دریافت شد.');
        }

        $retStatus = $body['RetStatus'] ?? null;
        if ($retStatus !== null && (int) $retStatus !== 1) {
            $message = trim((string) ($body['StrRetStatus'] ?? ''));

            throw new RuntimeException($message !== '' ? $message : 'ارسال پیامک از ملی پیامک ناموفق بود.');
        }

        $value = $body['Value'] ?? $body['value'] ?? $response->body();
        $recId = is_numeric($value) ? (string) $value : trim((string) $value);

        if ($recId === '' || (is_numeric($recId) && (int) $recId < 0)) {
            throw new RuntimeException($this->errorMessage($recId));
        }

        return $recId;
    }

    /**
     * @return array{username: string, password: string, rest_url: string}
     */
    private function resolveConfig(?string $username = null, ?string $password = null, ?string $restUrl = null): array
    {
        $stored = AppSetting::melipayamakConfig();

        return [
            'username' => $username ?? $stored['username'],
            'password' => $password ?? $stored['password'],
            'rest_url' => $restUrl ?? $stored['rest_url'],
        ];
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '0'.$digits;
        }

        return $digits;
    }

    private function errorMessage(string $code): string
    {
        return match ($code) {
            '-1' => 'نام کاربری یا رمز ملی پیامک اشتباه است.',
            '-2' => 'اعتبار پنل ملی پیامک کافی نیست.',
            '-3' => 'محدودیت ارسال روزانه ملی پیامک.',
            '-4' => 'محدودیت حجم ارسال ملی پیامک.',
            '-5' => 'شماره فرستنده معتبر نیست.',
            '-6' => 'سامانه در حال بروزرسانی است.',
            '-7' => 'متن حاوی کلمه فیلترشده است.',
            '-10' => 'پترن انتخاب‌شده در ملی پیامک یافت نشد.',
            default => 'ارسال پیامک از ملی پیامک ناموفق بود.',
        };
    }
}
