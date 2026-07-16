<?php

namespace App\Modules\TelegramBot\Services;

class IranMobileNormalizer
{
    public function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        $digits = preg_replace('/\D/u', '', $input) ?? '';

        if (str_starts_with($digits, '0098')) {
            $digits = substr($digits, 4);
        }

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            $digits = '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        if (! preg_match('/^09\d{9}$/', $digits)) {
            return null;
        }

        return $digits;
    }
}
