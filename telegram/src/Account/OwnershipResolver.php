<?php

declare(strict_types=1);

namespace TelegramHost\Account;

use TelegramHost\Http\LiveClient;
use TelegramHost\Support\IranSyncFailureException;

/**
 * Local cache first, then Iran live/access/owns before showing buy UI.
 */
final class OwnershipResolver
{
    public function __construct(
        private readonly AccountCache $accounts,
        private readonly LiveClient $live,
    ) {}

    public function ownsProduct(int $telegramUserId, int $productId): bool
    {
        if ($productId <= 0 || $telegramUserId <= 0) {
            return false;
        }

        if ($this->accounts->ownsProduct($telegramUserId, $productId)) {
            return true;
        }

        try {
            $response = $this->live->accessOwns($telegramUserId, $productId);
            if (! empty($response['owns'])) {
                $this->accounts->mergeOwnedProductIds($telegramUserId, [$productId]);

                return true;
            }
        } catch (IranSyncFailureException) {
            // Iran unreachable — rely on cache only.
        } catch (\Throwable $e) {
            error_log('[telegram-host] ownership live check: '.$e->getMessage());
        }

        return false;
    }
}
