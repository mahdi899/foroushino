<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/** Inline keyboard buttons with premium emoji icons (matches Laravel bot). */
final class InlineButtons
{
    /** @return array<string, mixed> */
    public static function buy(int $productId, string $label = 'خرید امن و آنی'): array
    {
        return [
            'text' => $label,
            'callback_data' => 'buy:'.$productId,
            'style' => 'success',
            ...TelegramCustomEmoji::buttonIcon('cart'),
        ];
    }

    /** @return array<string, mixed> */
    public static function callback(string $text, string $data, string $iconKey, string $style = ''): array
    {
        $btn = [
            'text' => $text,
            'callback_data' => $data,
            ...TelegramCustomEmoji::buttonIcon($iconKey),
        ];
        if ($style !== '') {
            $btn['style'] = $style;
        }

        return $btn;
    }

    /** @return array<string, mixed> */
    public static function url(string $text, string $url, string $iconKey = 'globe', string $style = ''): array
    {
        $btn = [
            'text' => $text,
            'url' => $url,
            ...TelegramCustomEmoji::buttonIcon($iconKey),
        ];
        if ($style !== '') {
            $btn['style'] = $style;
        }

        return $btn;
    }

    /** @return array<string, mixed> */
    public static function capacityCheck(int $seminarId): array
    {
        return self::callback('بررسی ظرفیت', 'seminar:check:'.$seminarId, 'user');
    }

    /** @return array<string, mixed> */
    public static function membershipRecheck(): array
    {
        return self::callback('عضو شدم', 'membership:recheck', 'check', 'success');
    }

    /** @return array<string, mixed> */
    public static function payOnline(string $url): array
    {
        return self::url('پرداخت آنلاین', $url, 'money', 'success');
    }

    /** @return array<string, mixed> */
    public static function skipDiscount(int $productId): array
    {
        return self::callback('بدون کد تخفیف', 'buy:skip:'.$productId, 'point_up');
    }
}
