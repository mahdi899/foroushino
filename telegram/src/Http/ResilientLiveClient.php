<?php

declare(strict_types=1);

namespace TelegramHost\Http;

/**
 * Live Iran API with fast failure — user always gets a local message, never a long hang.
 */
final class ResilientLiveClient
{
    public function __construct(private readonly LiveClient $live) {}

    /** @param array<string, mixed> $update */
    public function processUpdate(array $update): array
    {
        return $this->wrap(fn () => $this->live->processUpdate($update));
    }

    /** @return array<string, mixed> */
    public function discountPreview(int $telegramUserId, int $productId, string $code): array
    {
        return $this->wrap(fn () => $this->live->discountPreview($telegramUserId, $productId, $code));
    }

    /** @return array<string, mixed> */
    public function checkoutZarinpal(int $telegramUserId, int $productId, ?string $coupon = null): array
    {
        return $this->wrap(fn () => $this->live->checkoutZarinpal($telegramUserId, $productId, $coupon));
    }

    /** @return array<string, mixed> */
    public function checkoutC2c(int $telegramUserId, int $chatId, int $productId, ?string $coupon = null): array
    {
        return $this->wrap(fn () => $this->live->checkoutC2c($telegramUserId, $chatId, $productId, $coupon));
    }

    /** @param array<string, mixed> $message */
    public function supportTryReply(int $telegramUserId, array $message): array
    {
        return $this->wrap(fn () => $this->live->supportTryReply($telegramUserId, $message));
    }

    /** @return array<string, mixed> */
    public function supportPrepare(int $telegramUserId, string $category): array
    {
        return $this->wrap(fn () => $this->live->supportPrepare($telegramUserId, $category));
    }

    /** @return array<string, mixed> */
    public function satOpen(int $telegramUserId, int $chatId): array
    {
        return $this->wrap(fn () => $this->live->satOpen($telegramUserId, $chatId));
    }

    /**
     * @param  callable(): array<string, mixed>  $call
     * @return array<string, mixed>
     */
    private function wrap(callable $call): array
    {
        try {
            return $call();
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'offline' => true,
                'message' => 'این بخش موقتاً به سرور اصلی وصل نیست. منو و اطلاعات ذخیره‌شده در دسترس است؛ پرداخت و پشتیبانی زنده بعد از اتصال مجدد فعال می‌شود.',
            ];
        }
    }
}
