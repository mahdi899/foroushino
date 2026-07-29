<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Services\IranFailureReporter;
use TelegramHost\Support\IranSyncFailureException;
use TelegramHost\Telegram\BotApiClient;

/**
 * Live Iran API — sends typing to the user, reports outages to the reports group.
 */
final class ResilientLiveClient
{
    public function __construct(
        private readonly LiveClient $live,
        private readonly BotApiClient $api,
        private readonly IranFailureReporter $reporter,
    ) {}

    /** @param array<string, mixed> $update */
    public function processUpdate(array $update, int $chatId, int $telegramUserId): array
    {
        return $this->invoke($chatId, $telegramUserId, 'پردازش آپدیت روی سرور اصلی', fn () => $this->live->processUpdate($update), showTyping: true);
    }

    /** @return array<string, mixed> */
    public function productPresent(int $chatId, int $telegramUserId, int $productId): array
    {
        return $this->invoke(
            $chatId,
            $telegramUserId,
            'نمایش دسترسی محصول',
            fn () => $this->live->productPresent($telegramUserId, $productId),
            showTyping: false,
        );
    }

    /** @return array<string, mixed> */
    public function discountPreview(int $chatId, int $telegramUserId, int $productId, string $code): array
    {
        return $this->invoke($chatId, $telegramUserId, 'بررسی کد تخفیف', fn () => $this->live->discountPreview($telegramUserId, $productId, $code), showTyping: false);
    }

    /** @return array<string, mixed> */
    public function checkoutZarinpal(int $chatId, int $telegramUserId, int $productId, ?string $coupon = null): array
    {
        return $this->invoke($chatId, $telegramUserId, 'شروع پرداخت زرین‌پال', fn () => $this->live->checkoutZarinpal($telegramUserId, $productId, $coupon), showTyping: true);
    }

    /** Best-effort: invalidate open bot payment links when leaving checkout. */
    public function checkoutRevokeOpen(int $chatId, int $telegramUserId): array
    {
        return $this->invoke(
            $chatId,
            $telegramUserId,
            'باطل‌سازی لینک پرداخت',
            fn () => $this->live->checkoutRevokeOpen($telegramUserId),
            showTyping: false,
        );
    }

    /** @return array<string, mixed> */
    public function checkoutC2c(int $chatId, int $telegramUserId, int $productId, ?string $coupon = null): array
    {
        return $this->invoke($chatId, $telegramUserId, 'شروع پرداخت کارت‌به‌کارت', fn () => $this->live->checkoutC2c($telegramUserId, $chatId, $productId, $coupon), showTyping: true);
    }

    /** @return array<string, mixed> */
    public function satSubmit(int $chatId, int $telegramUserId, array $draft): array
    {
        return $this->invoke($chatId, $telegramUserId, 'ثبت درخواست سات', fn () => $this->live->satSubmit($telegramUserId, $draft), showTyping: true);
    }

    /** @return array<string, mixed> */
    public function capacityCheck(int $chatId, int $telegramUserId, int $seminarId): array
    {
        return $this->invoke($chatId, $telegramUserId, 'بررسی ظرفیت سمینار', fn () => $this->live->capacityCheck($seminarId), showTyping: false);
    }

    /**
     * @param  callable(): array<string, mixed>  $call
     * @return array<string, mixed>
     */
    private function invoke(int $chatId, int $telegramUserId, string $operation, callable $call, bool $showTyping = false): array
    {
        // Typing only on checkout / admin-ish writes — not on cache-miss reads.
        if ($showTyping && $chatId !== 0) {
            $this->api->sendChatAction($chatId, 'typing');
        }

        try {
            return $call();
        } catch (IranSyncFailureException $e) {
            $this->reporter->reportFailure($telegramUserId, $operation, $e);

            return [
                'ok' => false,
                'offline' => true,
            ];
        } catch (\Throwable $e) {
            $this->reporter->reportUnexpected($telegramUserId, $operation, $e->getMessage());

            return [
                'ok' => false,
                'offline' => true,
            ];
        }
    }
}
