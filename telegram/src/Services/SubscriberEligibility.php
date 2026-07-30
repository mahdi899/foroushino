<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;

/**
 * Qualifying subscription for ticket/support gates on the host cache.
 */
final class SubscriberEligibility
{
    public function __construct(
        private readonly AccountCache $accounts,
        private readonly SyncCache $cache,
    ) {}

    public function requiresSubscriptionForSupport(): bool
    {
        return $this->cache->featureEnabled('ticket_requires_subscription')
            || $this->cache->featureEnabled('support_requires_subscription');
    }

    public function hasQualifyingAccess(int $telegramUserId): bool
    {
        $account = $this->accounts->get($telegramUserId);
        if ($account === null) {
            return false;
        }

        if (empty($account['user_id'])) {
            return false;
        }

        $owned = json_decode((string) ($account['owned_product_ids'] ?? '[]'), true);
        if (is_array($owned) && $owned !== []) {
            return true;
        }

        $sat = $this->accounts->satSnapshot($telegramUserId);
        if (is_array($sat) && strtolower((string) ($sat['status'] ?? '')) === 'accepted') {
            return true;
        }

        if ($this->accounts->hasSeminarOnAccount($telegramUserId, $this->cache)) {
            return true;
        }

        $profileRaw = $account['profile_json'] ?? null;
        if (is_string($profileRaw) && $profileRaw !== '') {
            $profile = json_decode($profileRaw, true);
            if (is_array($profile) && ! empty($profile['has_paid_order'])) {
                return true;
            }
        }

        return false;
    }

    public function denialMessage(): string
    {
        return '⛔ برای این بخش باید حداقل یک اشتراک فعال داشته باشید '
            .'(دوره کمپین، سمینار، یا سات پذیرفته‌شده).';
    }
}
