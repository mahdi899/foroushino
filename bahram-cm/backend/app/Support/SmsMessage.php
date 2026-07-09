<?php

namespace App\Support;

final class SmsMessage
{
    public const OPT_OUT_SUFFIX = 'لغو11';

    public const DEFAULT_TEST_MESSAGE = 'این یک پیامک آزمایشی از پنل مدیریت بهرام است. '.self::OPT_OUT_SUFFIX;

    public static function hasOptOutSuffix(string $message): bool
    {
        return str_ends_with(trim($message), self::OPT_OUT_SUFFIX);
    }

    public static function optOutValidationMessage(): string
    {
        return '(لغو11) رو انتهای پیام نزاشتی';
    }
}
