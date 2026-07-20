<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Models\Seminar;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Support\JalaliDate;
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
            [$this->paymentButton('🛒 خرید و پرداخت', $product->id)],
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
            $lines[] = '📅 '.JalaliDate::formatDateTime($seminar->date);
        }

        if (filled($seminar->location)) {
            $lines[] = '📍 '.trim((string) $seminar->location);
        }

        if (filled($seminar->description)) {
            $lines[] = '';
            $lines[] = trim(strip_tags((string) $seminar->description));
        }

        [$price, $sale] = $this->seminarPrices($seminar);
        if ($price > 0) {
            $lines[] = '';
            $lines[] = $this->formatPriceLine($price, $sale);
        }

        if ($seminar->capacity !== null && $seminar->capacity > 0) {
            $lines[] = $seminar->isFull()
                ? '⚠️ ظرفیت تکمیل شده'
                : '👥 ظرفیت باقی‌مانده: '.$seminar->remainingSeats();
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
        [$price] = $this->seminarPrices($seminar);

        if ($seminar->isFull()) {
            $keyboard[] = [['text' => '⛔ ظرفیت تکمیل شده', 'callback_data' => 'seminar:full']];
        } elseif ($product && $product->is_active && $price > 0) {
            $keyboard[] = [$this->paymentButton('🛒 ثبت‌نام / پرداخت', $product->id)];
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

    /** @return array{text: string, callback_data: string, style: string} */
    private function paymentButton(string $label, int $productId): array
    {
        return [
            'text' => $label,
            'callback_data' => 'buy:'.$productId,
            'style' => 'success',
        ];
    }

    private function formatPriceLine(int $price, ?int $salePrice): string
    {
        if ($salePrice !== null && $salePrice > 0 && $salePrice < $price) {
            return 'قیمت اصلی: '.number_format($price)." تومان\nقیمت با تخفیف: ".number_format($salePrice).' تومان';
        }

        return 'قیمت: '.number_format($price).' تومان';
    }

    /** @return array{0: int, 1: int|null} */
    private function seminarPrices(Seminar $seminar): array
    {
        $product = $seminar->product;
        $price = (int) ($seminar->price ?: $product?->price ?: 0);
        $sale = $seminar->sale_price ?? $product?->sale_price;
        $sale = $sale !== null ? (int) $sale : null;

        return [$price, $sale];
    }
}
