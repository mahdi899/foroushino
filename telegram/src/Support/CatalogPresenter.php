<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/** Catalog card captions with premium emoji (subset of Laravel TelegramContentPresenter). */
final class CatalogPresenter
{
    /** @param array<string, mixed> $course */
    public static function courseCaption(array $course): string
    {
        $title = htmlspecialchars((string) ($course['title'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $price = isset($course['price']) ? (int) $course['price'] : 0;
        $sale = isset($course['sale_price']) ? (int) $course['sale_price'] : null;

        $lines = [
            TelegramCustomEmoji::tag('sparkles').' <b>'.$title.'</b>',
            '──────────────',
            self::formatPriceLine($price, $sale),
            '',
            TelegramCustomEmoji::tag('point_up').' یکی از دکمه‌های زیر را بزنید:',
        ];

        return implode("\n", $lines);
    }

    /** @param array<string, mixed> $seminar */
    public static function seminarCaption(array $seminar): string
    {
        $title = htmlspecialchars((string) ($seminar['title'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $lines = [
            TelegramCustomEmoji::tag('mic').' <b>'.$title.'</b>',
            '──────────────',
        ];

        if (! empty($seminar['seminar_date'])) {
            $lines[] = TelegramCustomEmoji::tag('calendar').' <b>زمان:</b> '.htmlspecialchars((string) $seminar['seminar_date'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        if (! empty($seminar['location'])) {
            $lines[] = TelegramCustomEmoji::tag('pin').' <b>مکان:</b> '.htmlspecialchars((string) $seminar['location'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        $price = isset($seminar['price']) ? (int) $seminar['price'] : 0;
        $sale = isset($seminar['sale_price']) ? (int) $seminar['sale_price'] : null;
        if ($price > 0) {
            $lines[] = '';
            $lines[] = self::formatPriceLine($price, $sale);
        }

        $lines[] = '';
        $lines[] = TelegramCustomEmoji::tag('point_up').' برای ثبت‌نام از دکمه‌های زیر استفاده کنید:';

        return implode("\n", $lines);
    }

    private static function formatPriceLine(int $price, ?int $salePrice): string
    {
        if ($salePrice !== null && $salePrice > 0 && $salePrice < $price) {
            return TelegramCustomEmoji::tag('money').' <b>قیمت اصلی:</b> '.number_format($price).' تومان'
                ."\n".TelegramCustomEmoji::tag('fire').' <b>قیمت ویژه:</b> '.number_format($salePrice).' تومان';
        }

        return TelegramCustomEmoji::tag('money').' <b>قیمت:</b> '.number_format($price).' تومان';
    }
}
