<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class MelipayamakClient
{
    /**
     * @param  list<string>  $variables
     */
    public function sendByBaseNumber(string $to, int $bodyId, array $variables): string
    {
        $username = (string) config('melipayamak.username');
        $password = (string) config('melipayamak.password');

        if ($username === '' || $password === '') {
            throw new RuntimeException('نام کاربری یا رمز ملی پیامک در سرور تنظیم نشده است.');
        }

        if ($bodyId <= 0) {
            throw new RuntimeException('کد پترن ملی پیامک معتبر نیست.');
        }

        $text = implode(';', array_map(
            fn (string $value) => str_replace(';', ' ', $value),
            $variables,
        ));

        $response = Http::timeout(20)
            ->asJson()
            ->post(rtrim((string) config('melipayamak.rest_url'), '/').'/SendByBaseNumber', [
                'username' => $username,
                'password' => $password,
                'to' => $this->normalizePhone($to),
                'bodyId' => $bodyId,
                'text' => $text,
            ]);

        if (! $response->ok()) {
            throw new RuntimeException('ارتباط با ملی پیامک برقرار نشد.');
        }

        $value = $response->json('Value') ?? $response->json('value') ?? $response->body();
        $recId = is_numeric($value) ? (string) $value : trim((string) $value);

        if ($recId === '' || (is_numeric($recId) && (int) $recId < 0)) {
            throw new RuntimeException($this->errorMessage($recId));
        }

        return $recId;
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
