<?php

declare(strict_types=1);

namespace TelegramHost\Account;

/**
 * Ownership from local account snapshot only — Iran pushes owned_product_ids;
 * blocking live/access/owns on cache miss was a major webhook latency source.
 */
final class OwnershipResolver
{
    public function __construct(
        private readonly AccountCache $accounts,
    ) {}

    public function ownsProduct(int $telegramUserId, int $productId): bool
    {
        if ($productId <= 0 || $telegramUserId <= 0) {
            return false;
        }

        return $this->accounts->ownsProduct($telegramUserId, $productId);
    }
}
