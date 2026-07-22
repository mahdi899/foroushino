<?php

declare(strict_types=1);

namespace TelegramHost\Http;

/**
 * Live calls to the main server — purchase, discount, ownership, profile,
 * support, referral, family, SAT, and full update delegation for admin/groups.
 */
final class LiveClient
{
    public function __construct(private readonly SyncClient $sync) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function live(string $path, array $payload): array
    {
        return $this->sync->call('live/'.$path, $payload);
    }

    /** @param array<string, mixed> $update */
    public function processUpdate(array $update): array
    {
        return $this->live('process-update', ['update' => $update]);
    }

    /** @return array<string, mixed> */
    public function discountPreview(int $telegramUserId, int $productId, string $code): array
    {
        return $this->live('discount/preview', [
            'telegram_user_id' => $telegramUserId,
            'product_id' => $productId,
            'code' => $code,
        ]);
    }

    /** @return array<string, mixed> */
    public function accessOwns(int $telegramUserId, int $productId): array
    {
        return $this->live('access/owns', [
            'telegram_user_id' => $telegramUserId,
            'product_id' => $productId,
        ]);
    }

    /** @return array<string, mixed> */
    public function productPresent(int $telegramUserId, int $productId): array
    {
        return $this->live('product/present', [
            'telegram_user_id' => $telegramUserId,
            'product_id' => $productId,
        ]);
    }

    /** @return array<string, mixed> */
    public function checkoutZarinpal(int $telegramUserId, int $productId, ?string $coupon = null): array
    {
        return $this->live('checkout/zarinpal/start', array_filter([
            'telegram_user_id' => $telegramUserId,
            'product_id' => $productId,
            'coupon' => $coupon,
        ]));
    }

    /** @return array<string, mixed> */
    public function checkoutC2c(int $telegramUserId, int $chatId, int $productId, ?string $coupon = null): array
    {
        return $this->live('checkout/c2c/start', array_filter([
            'telegram_user_id' => $telegramUserId,
            'chat_id' => $chatId,
            'product_id' => $productId,
            'coupon' => $coupon,
        ]));
    }

    /** @return array<string, mixed> */
    public function userProfile(int $telegramUserId): array
    {
        return $this->live('user/profile', ['telegram_user_id' => $telegramUserId]);
    }

    /** @return array<string, mixed> */
    public function referralSummary(int $telegramUserId): array
    {
        return $this->live('referral/summary', ['telegram_user_id' => $telegramUserId]);
    }

    /** @return array<string, mixed> */
    public function familySummary(int $telegramUserId): array
    {
        return $this->live('family/summary', ['telegram_user_id' => $telegramUserId]);
    }

    /** @return array<string, mixed> */
    public function satOpen(int $telegramUserId, int $chatId): array
    {
        return $this->live('sat/open', [
            'telegram_user_id' => $telegramUserId,
            'chat_id' => $chatId,
        ]);
    }

    /** @return array<string, mixed> */
    public function supportPrepare(int $telegramUserId, string $category): array
    {
        return $this->live('support/prepare', [
            'telegram_user_id' => $telegramUserId,
            'category' => $category,
        ]);
    }

    /**
     * @param array<string, mixed> $message
     * @return array<string, mixed>
     */
    public function supportTryReply(int $telegramUserId, array $message): array
    {
        return $this->live('support/try-reply', [
            'telegram_user_id' => $telegramUserId,
            'message' => $message,
        ]);
    }

    /** @return array<string, mixed> */
    public function supportSend(int $telegramUserId, int $chatId, string $category, string $text, int $messageId, bool $hasMedia = false): array
    {
        return $this->live('support/send', [
            'telegram_user_id' => $telegramUserId,
            'chat_id' => $chatId,
            'category' => $category,
            'text' => $text,
            'message_id' => $messageId,
            'has_media' => $hasMedia,
        ]);
    }

    /** @return array<string, mixed> */
    public function capacityCheck(int $seminarId): array
    {
        return $this->sync->call('capacity-check', ['seminar_id' => $seminarId]);
    }
}
