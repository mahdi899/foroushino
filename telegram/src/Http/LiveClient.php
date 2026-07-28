<?php

declare(strict_types=1);

namespace TelegramHost\Http;

/**
 * Live calls to the main server — purchase, discount, ownership, profile,
 * referral, family, SAT, and full update delegation for admin/groups.
 * Support runs locally on the host (HostSupportService) — no Iran live path.
 */
final class LiveClient
{
    public function __construct(private readonly SyncClient $sync) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function live(string $path, array $payload, ?int $timeoutSeconds = null, bool $allowRetry = true): array
    {
        return $timeoutSeconds === null
            ? $this->sync->call('live/'.$path, $payload, 8, $allowRetry)
            : $this->sync->call('live/'.$path, $payload, $timeoutSeconds, $allowRetry);
    }

    /**
     * @param  array<string, mixed>  $update
     * @return array<string, mixed>
     */
    public function processUpdate(array $update, int $timeoutSeconds = 8, bool $allowRetry = false): array
    {
        // UI relay (admin) must not double-wait on retry; bg drain can pass allowRetry=true.
        return $this->live('process-update', ['update' => $update], $timeoutSeconds, $allowRetry);
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
        // Iran creates the order + calls Zarinpal — keep headroom so a slow
        // gateway round-trip is not misread as "payment server offline".
        return $this->live('checkout/zarinpal/start', array_filter([
            'telegram_user_id' => $telegramUserId,
            'product_id' => $productId,
            'coupon' => $coupon,
        ]), 28);
    }

    /** @return array<string, mixed> */
    public function checkoutC2c(int $telegramUserId, int $chatId, int $productId, ?string $coupon = null): array
    {
        return $this->live('checkout/c2c/start', array_filter([
            'telegram_user_id' => $telegramUserId,
            'chat_id' => $chatId,
            'product_id' => $productId,
            'coupon' => $coupon,
        ]), 20);
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

    /**
     * @param  array{name: string, city?: mixed, age?: mixed}  $draft
     * @return array<string, mixed>
     */
    public function satSubmit(int $telegramUserId, array $draft): array
    {
        return $this->live('sat/submit', array_merge([
            'telegram_user_id' => $telegramUserId,
        ], $draft), 10);
    }

    /** @param array<string, mixed> $payload */
    public function supportSyncTicket(array $payload): array
    {
        return $this->live('support/sync-ticket', $payload, 8, false);
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array<string, mixed>
     */
    public function destinationMembershipSync(int $telegramUserId, array $items): array
    {
        return $this->live('destination-membership/sync', [
            'telegram_user_id' => $telegramUserId,
            'items' => $items,
        ], 8, false);
    }

    /** @return array<string, mixed> */
    public function capacityCheck(int $seminarId): array
    {
        return $this->sync->call('capacity-check', ['seminar_id' => $seminarId]);
    }
}
