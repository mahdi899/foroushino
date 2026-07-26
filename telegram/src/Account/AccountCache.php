<?php

declare(strict_types=1);

namespace TelegramHost\Account;

/**
 * Local mirror of Telegram-linked users — identity, entitlements, and
 * pre-rendered menu payloads. Updated via push from Iran or account/fetch pull.
 */
final class AccountCache
{
    public function __construct(private readonly \PDO $pdo) {}

    /** @return array<string, mixed>|null */
    public function get(int $telegramUserId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM telegram_accounts_cache WHERE telegram_user_id = :id');
        $stmt->execute(['id' => $telegramUserId]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $account */
    public function store(int $telegramUserId, array $account): void
    {
        $snapshot = is_array($account['snapshot'] ?? null) ? $account['snapshot'] : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (
                telegram_user_id, user_id, mobile, mobile_verified_at, display_name, is_bot_admin,
                snapshot_revision, owned_product_ids, profile_json, referral_json, family_json, owned_presents_json,
                snapshot_synced_at, updated_at
             ) VALUES (
                :id, :user_id, :mobile, :verified_at, :display_name, :is_admin,
                :snap_rev, :owned, :profile, :referral, :family, :presents,
                :snap_at, NOW()
             )
             ON DUPLICATE KEY UPDATE
                user_id = :user_id2,
                mobile = :mobile2,
                mobile_verified_at = :verified_at2,
                display_name = :display_name2,
                is_bot_admin = :is_admin2,
                snapshot_revision = COALESCE(:snap_rev2, snapshot_revision),
                owned_product_ids = COALESCE(:owned2, owned_product_ids),
                profile_json = COALESCE(:profile2, profile_json),
                referral_json = COALESCE(:referral2, referral_json),
                family_json = COALESCE(:family2, family_json),
                owned_presents_json = COALESCE(:presents2, owned_presents_json),
                snapshot_synced_at = COALESCE(:snap_at2, snapshot_synced_at),
                updated_at = NOW()',
        );

        $ownedJson = null;
        $profileJson = null;
        $referralJson = null;
        $familyJson = null;
        $presentsJson = null;
        $snapRev = null;
        $snapAt = null;

        if ($snapshot !== null) {
            $snapRev = (string) ($snapshot['revision'] ?? '');
            $ownedJson = json_encode($snapshot['owned_product_ids'] ?? [], JSON_UNESCAPED_UNICODE);
            $profileJson = json_encode($snapshot['profile'] ?? null, JSON_UNESCAPED_UNICODE);
            $referralJson = json_encode($snapshot['referral'] ?? null, JSON_UNESCAPED_UNICODE);
            $familyJson = json_encode($snapshot['family'] ?? null, JSON_UNESCAPED_UNICODE);
            $presentsJson = json_encode($snapshot['owned_presents'] ?? [], JSON_UNESCAPED_UNICODE);
            $snapAt = date('Y-m-d H:i:s');
        }

        $params = [
            'id' => $telegramUserId,
            'user_id' => $account['user_id'] ?? null,
            'mobile' => $account['mobile'] ?? null,
            'verified_at' => $this->normalizeDateTime($account['mobile_verified_at'] ?? null),
            'display_name' => $account['display_name'] ?? null,
            'is_admin' => ! empty($account['is_bot_admin']) ? 1 : 0,
            'snap_rev' => $snapRev,
            'owned' => $ownedJson,
            'profile' => $profileJson,
            'referral' => $referralJson,
            'family' => $familyJson,
            'presents' => $presentsJson,
            'snap_at' => $snapAt,
        ];

        $stmt->execute(array_merge($params, [
            'user_id2' => $params['user_id'],
            'mobile2' => $params['mobile'],
            'verified_at2' => $params['verified_at'],
            'display_name2' => $params['display_name'],
            'is_admin2' => $params['is_admin'],
            'snap_rev2' => $snapRev,
            'owned2' => $ownedJson,
            'profile2' => $profileJson,
            'referral2' => $referralJson,
            'family2' => $familyJson,
            'presents2' => $presentsJson,
            'snap_at2' => $snapAt,
        ]));
    }

    public function isVerified(int $telegramUserId): bool
    {
        $account = $this->get($telegramUserId);

        return $account !== null && ! empty($account['mobile_verified_at']);
    }

    public function isBotAdmin(int $telegramUserId): bool
    {
        $account = $this->get($telegramUserId);

        return $account !== null && (int) ($account['is_bot_admin'] ?? 0) === 1;
    }

    public function ownsProduct(int $telegramUserId, int $productId): bool
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return false;
        }

        $ids = $this->decodeIntList((string) ($account['owned_product_ids'] ?? '[]'));

        return in_array($productId, $ids, true);
    }

    /** @return array<string, mixed>|null */
    public function profileResponse(int $telegramUserId): ?array
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return null;
        }

        return $this->decodeJsonObject($account['profile_json'] ?? null);
    }

    /** @return array<string, mixed>|null */
    public function referralResponse(int $telegramUserId): ?array
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return null;
        }

        return $this->decodeJsonObject($account['referral_json'] ?? null);
    }

    /** @return array<string, mixed>|null */
    public function familyResponse(int $telegramUserId): ?array
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return null;
        }

        return $this->decodeJsonObject($account['family_json'] ?? null);
    }

    /** @return array<string, mixed>|null */
    public function ownedPresent(int $telegramUserId, int $productId): ?array
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return null;
        }

        $map = $this->decodeJsonObject($account['owned_presents_json'] ?? null);
        if (! is_array($map)) {
            return null;
        }

        $present = $map[(string) $productId] ?? null;

        return is_array($present) ? $present : null;
    }

    public function shouldRefreshSnapshot(int $telegramUserId, int $minAgeSeconds): bool
    {
        if (! $this->isVerified($telegramUserId)) {
            return false;
        }

        $account = $this->get($telegramUserId);
        if ($account === null || empty($account['profile_json'])) {
            return true;
        }

        $syncedAt = strtotime((string) ($account['snapshot_synced_at'] ?? ''));
        if ($syncedAt === false || $syncedAt <= 0) {
            return true;
        }

        return (time() - $syncedAt) >= $minAgeSeconds;
    }

    /** @return list<int> */
    private function decodeIntList(string $json): array
    {
        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        return array_values(array_map('intval', $decoded));
    }

    /** @return array<string, mixed>|null */
    private function decodeJsonObject(mixed $json): ?array
    {
        if (! is_string($json) || $json === '') {
            return null;
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function normalizeDateTime(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value) && str_contains($value, 'T')) {
            $ts = strtotime($value);

            return $ts !== false ? date('Y-m-d H:i:s', $ts) : null;
        }

        return is_string($value) ? $value : null;
    }
}
