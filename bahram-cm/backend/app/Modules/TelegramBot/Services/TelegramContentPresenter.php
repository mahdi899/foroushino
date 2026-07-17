<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Models\Seminar;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use Illuminate\Support\Carbon;

class TelegramContentPresenter
{
    public function formatProductMessage(Product $product): string
    {
        $lines = ['🎓 '.trim((string) $product->title), ''];

        if (filled($product->short_description)) {
            $lines[] = trim(strip_tags((string) $product->short_description));
            $lines[] = '';
        }

        $lines[] = $this->formatPriceLine(
            (int) $product->price,
            $product->sale_price !== null ? (int) $product->sale_price : null,
        );

        return implode("\n", $lines);
    }

    /** @return array<string, mixed> */
    public function productSendOptions(Product $product): array
    {
        return $this->productReplyMarkup($product);
    }

    /** @return array<string, mixed> */
    public function productReplyMarkup(Product $product): array
    {
        $keyboard = [
            [['text' => '🛒 خرید و پرداخت', 'callback_data' => 'buy:'.$product->id]],
            ...TelegramSiteUrl::urlKeyboardRow(
                '🌐 مشاهده در سایت',
                TelegramSiteUrl::resolve($product->landing_href, $product->slug),
            ),
        ];

        return ['reply_markup' => ['inline_keyboard' => $keyboard]];
    }

    public function formatSeminarMessage(Seminar $seminar): string
    {
        $lines = ['🎤 '.trim((string) $seminar->title), ''];

        if ($seminar->date instanceof Carbon) {
            $lines[] = '📅 '.$seminar->date->timezone(config('app.timezone'))->format('Y/m/d H:i');
        }

        if (filled($seminar->location)) {
            $lines[] = '📍 '.trim((string) $seminar->location);
        }

        if (filled($seminar->description)) {
            $lines[] = '';
            $lines[] = trim(strip_tags((string) $seminar->description));
        }

        $price = (int) ($seminar->price ?? $seminar->product?->price ?? 0);
        $sale = $seminar->sale_price ?? $seminar->product?->sale_price;
        $sale = $sale !== null ? (int) $sale : null;

        if ($price > 0) {
            $lines[] = '';
            $lines[] = $this->formatPriceLine($price, $sale);
        }

        $remaining = $seminar->remainingSeats();
        if ($remaining !== null) {
            $lines[] = $seminar->isFull() ? '⚠️ ظرفیت تکمیل شده' : "👥 ظرفیت باقی‌مانده: {$remaining}";
        }

        return implode("\n", $lines);
    }

    /** @return array<string, mixed> */
    public function seminarSendOptions(Seminar $seminar): array
    {
        return $this->seminarReplyMarkup($seminar);
    }

    /** @return array<string, mixed> */
    public function seminarReplyMarkup(Seminar $seminar): array
    {
        $keyboard = [];

        $product = $seminar->product;
        if ($product && $product->is_active && (int) ($seminar->price ?? $product->price ?? 0) > 0 && ! $seminar->isFull()) {
            $keyboard[] = [['text' => '🛒 ثبت‌نام / خرید', 'callback_data' => 'buy:'.$product->id]];
        }

        $keyboard = [
            ...$keyboard,
            ...TelegramSiteUrl::urlKeyboardRow('🌐 مشاهده در سایت', TelegramSiteUrl::seminarPage($seminar->slug)),
        ];

        if ($keyboard === []) {
            return [];
        }

        return ['reply_markup' => ['inline_keyboard' => $keyboard]];
    }

    private function formatPriceLine(int $price, ?int $salePrice): string
    {
        if ($salePrice !== null && $salePrice > 0 && $salePrice < $price) {
            return 'قیمت: '.number_format($price)." تومان\nقیمت ویژه: ".number_format($salePrice).' تومان';
        }

        return 'قیمت: '.number_format($price).' تومان';
    }
}
