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
        $this->ensureSatColumn();
        $snapshot = is_array($account['snapshot'] ?? null) ? $account['snapshot'] : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (
                telegram_user_id, user_id, mobile, mobile_verified_at, display_name, is_bot_admin,
                snapshot_revision, owned_product_ids, profile_json, referral_json, family_json, owned_presents_json, sat_json,
                snapshot_synced_at, updated_at
             ) VALUES (
                :id, :user_id, :mobile, :verified_at, :display_name, :is_admin,
                :snap_rev, :owned, :profile, :referral, :family, :presents, :sat,
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
                sat_json = COALESCE(:sat2, sat_json),
                snapshot_synced_at = COALESCE(:snap_at2, snapshot_synced_at),
                updated_at = NOW()',
        );

        $ownedJson = null;
        $profileJson = null;
        $referralJson = null;
        $familyJson = null;
        $presentsJson = null;
        $satJson = null;
        $snapRev = null;
        $snapAt = null;

        if ($snapshot !== null) {
            $snapRev = (string) ($snapshot['revision'] ?? '');
            $ownedJson = json_encode($snapshot['owned_product_ids'] ?? [], JSON_UNESCAPED_UNICODE);
            $profileJson = json_encode($snapshot['profile'] ?? null, JSON_UNESCAPED_UNICODE);
            $referralJson = json_encode($snapshot['referral'] ?? null, JSON_UNESCAPED_UNICODE);
            $familyJson = json_encode($snapshot['family'] ?? null, JSON_UNESCAPED_UNICODE);
            $presentsJson = json_encode($snapshot['owned_presents'] ?? [], JSON_UNESCAPED_UNICODE);
            $satJson = json_encode($snapshot['sat'] ?? null, JSON_UNESCAPED_UNICODE);
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
            'sat' => $satJson,
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
            'sat2' => $satJson,
            'snap_at2' => $snapAt,
        ]));
    }

    /** @return array<string, mixed>|null */
    public function satSnapshot(int $telegramUserId): ?array
    {
        $this->ensureSatColumn();
        $stmt = $this->pdo->prepare('SELECT sat_json FROM telegram_accounts_cache WHERE telegram_user_id = :id');
        $stmt->execute(['id' => $telegramUserId]);
        $raw = $stmt->fetchColumn();
        if (! is_string($raw) || $raw === '') {
            return null;
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function ensureSatColumn(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        try {
            $columns = $this->pdo->query('SHOW COLUMNS FROM telegram_accounts_cache')->fetchAll(\PDO::FETCH_COLUMN);
            $existing = is_array($columns) ? array_map('strval', $columns) : [];
            if (! in_array('sat_json', $existing, true)) {
                $this->pdo->exec('ALTER TABLE telegram_accounts_cache ADD COLUMN sat_json MEDIUMTEXT NULL');
            }
        } catch (\Throwable) {
        }
        $ready = true;
    }

    /**
     * Local-first registration step 1: remember the phone number right away,
     * before/without waiting for Iran to confirm. Does not mark the account
     * verified yet — that happens once the name is collected too, or once a
     * real snapshot arrives from Iran.
     */
    public function storePendingContact(int $telegramUserId, string $mobile): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (telegram_user_id, mobile, is_bot_admin, updated_at)
             VALUES (:id, :mobile, 0, NOW())
             ON DUPLICATE KEY UPDATE mobile = :mobile2, updated_at = NOW()',
        );
        $stmt->execute(['id' => $telegramUserId, 'mobile' => $mobile, 'mobile2' => $mobile]);
    }

    /**
     * Local-first registration step 2 (fallback when Iran is unreachable):
     * finish registration entirely on the host so the user isn't stuck. The
     * account is treated as verified locally; the next background account
     * sync reconciles it with the real Iran record once reachable again.
     */
    public function storeLocalOnlyRegistration(int $telegramUserId, string $mobile, string $displayName): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (telegram_user_id, mobile, mobile_verified_at, display_name, is_bot_admin, updated_at)
             VALUES (:id, :mobile, NOW(), :name, 0, NOW())
             ON DUPLICATE KEY UPDATE
                mobile = :mobile2,
                mobile_verified_at = COALESCE(mobile_verified_at, NOW()),
                display_name = :name2,
                updated_at = NOW()',
        );
        $stmt->execute([
            'id' => $telegramUserId,
            'mobile' => $mobile,
            'name' => $displayName,
            'mobile2' => $mobile,
            'name2' => $displayName,
        ]);
    }

    /**
     * Merges pre-provisioned access (pushed from Iran by mobile number,
     * before this user ever started the bot) into the row created moments
     * earlier by {@see storePendingContact()}/{@see storeLocalOnlyRegistration()}.
     * Only adds to owned_product_ids — never overwrites identity/verification
     * fields, which still come from the normal Iran registration/reconcile flow.
     *
     * @param  list<int>  $ownedProductIds
     */
    public function mergeOwnedProductIds(int $telegramUserId, array $ownedProductIds, ?string $displayNameHint = null): void
    {
        if ($ownedProductIds === []) {
            return;
        }

        $existing = $this->get($telegramUserId);
        $current = $existing !== null ? $this->decodeIntList((string) ($existing['owned_product_ids'] ?? '[]')) : [];
        $merged = array_values(array_unique(array_merge($current, $ownedProductIds)));
        $ownedJson = json_encode($merged, JSON_UNESCAPED_UNICODE);

        $hasDisplayName = $existing !== null && trim((string) ($existing['display_name'] ?? '')) !== '';

        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (telegram_user_id, display_name, owned_product_ids, is_bot_admin, updated_at)
             VALUES (:id, :name, :owned, 0, NOW())
             ON DUPLICATE KEY UPDATE
                owned_product_ids = :owned2,
                display_name = CASE WHEN display_name IS NULL OR display_name = "" THEN :name2 ELSE display_name END,
                updated_at = NOW()',
        );
        $stmt->execute([
            'id' => $telegramUserId,
            'name' => $hasDisplayName ? null : $displayNameHint,
            'owned' => $ownedJson,
            'owned2' => $ownedJson,
            'name2' => $displayNameHint,
        ]);
    }

    public function isVerified(int $telegramUserId): bool
    {
        $account = $this->get($telegramUserId);

        return $account !== null && ! empty($account['mobile_verified_at']);
    }

    /**
     * True when the local row is verified (mobile confirmed) but has no
     * Iran `user_id` yet — i.e. it was created entirely by
     * {@see storeLocalOnlyRegistration()} while Iran was unreachable and was
     * never actually reconciled with a real account on Iran. Left alone,
     * such a user stays a host-only "ghost": ownership, referral, family and
     * admin data never populate because Iran has no matching record.
     */
    public function needsIranReconcile(int $telegramUserId): bool
    {
        $account = $this->get($telegramUserId);

        return $account !== null
            && ! empty($account['mobile_verified_at'])
            && empty($account['user_id']);
    }

    /** @return array{mobile: string, display_name: string}|null */
    public function pendingRegistration(int $telegramUserId): ?array
    {
        if (! $this->needsIranReconcile($telegramUserId)) {
            return null;
        }

        $account = $this->get($telegramUserId);
        $mobile = trim((string) ($account['mobile'] ?? ''));
        $displayName = trim((string) ($account['display_name'] ?? ''));
        if ($mobile === '' || $displayName === '') {
            return null;
        }

        return ['mobile' => $mobile, 'display_name' => $displayName];
    }

    /** Seconds since the row was last touched — used to throttle reconcile retries. */
    public function secondsSinceUpdate(int $telegramUserId): int
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return PHP_INT_MAX;
        }

        $ts = strtotime((string) ($account['updated_at'] ?? ''));

        return $ts !== false && $ts > 0 ? max(0, time() - $ts) : PHP_INT_MAX;
    }

    public function isBotAdmin(int $telegramUserId): bool
    {
        if ($this->isPermanentBotAdmin($telegramUserId)) {
            return true;
        }

        $account = $this->get($telegramUserId);

        return $account !== null && (int) ($account['is_bot_admin'] ?? 0) === 1;
    }

    public function isPermanentBotAdmin(int $telegramUserId): bool
    {
        if ($telegramUserId <= 0) {
            return false;
        }

        $stmt = $this->pdo->prepare('SELECT body FROM bot_messages WHERE message_key = :key LIMIT 1');
        $stmt->execute(['key' => '__permanent_admin_user_ids']);
        $raw = trim((string) ($stmt->fetchColumn() ?: ''));
        if ($raw === '') {
            return false;
        }

        $ids = json_decode($raw, true);
        if (! is_array($ids)) {
            return false;
        }

        return in_array($telegramUserId, array_map('intval', $ids), true);
    }

    public function displayLabel(int $telegramUserId): string
    {
        $account = $this->get($telegramUserId);
        if ($account !== null) {
            $name = trim((string) ($account['display_name'] ?? ''));
            if ($name !== '') {
                return $name;
            }
            $mobile = trim((string) ($account['mobile'] ?? ''));
            if ($mobile !== '') {
                return $mobile;
            }
        }

        return 'کاربر '.$telegramUserId;
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

    public function hasIdentityLevel2(int $telegramUserId): bool
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return false;
        }

        $level = null;
        $profile = $this->decodeJsonObject($account['profile_json'] ?? null);
        if (is_array($profile) && array_key_exists('verification_level', $profile)) {
            $level = (int) $profile['verification_level'];
        }

        if ($level === null) {
            $snapshotMeta = $this->decodeJsonObject($account['owned_presents_json'] ?? null);
            // Iran may also mirror level next to presents under __meta (optional).
            if (is_array($snapshotMeta) && isset($snapshotMeta['__meta']['verification_level'])) {
                $level = (int) $snapshotMeta['__meta']['verification_level'];
            }
        }

        return $level !== null && $level >= 2;
    }

    public function hasSeminarOnAccount(int $telegramUserId, \TelegramHost\Cache\SyncCache $cache): bool
    {
        return $this->maxReferenceDiscount($telegramUserId, $cache) > 0
            || $this->legacyHasSeminarFlag($telegramUserId, $cache);
    }

    public function maxReferenceDiscount(int $telegramUserId, \TelegramHost\Cache\SyncCache $cache): int
    {
        $max = 0;
        foreach ($cache->seminars() as $seminar) {
            $productId = (int) ($seminar['product_id'] ?? 0);
            $discount = (int) ($seminar['reference_discount_amount'] ?? 0);
            if ($productId > 0 && $discount > 0 && $this->ownsProduct($telegramUserId, $productId)) {
                $max = max($max, $discount);
            }
        }

        if ($max > 0) {
            return $max;
        }

        // Fallback: any seminar ownership without configured discount amounts.
        return $this->legacyHasSeminarFlag($telegramUserId, $cache) ? 0 : 0;
    }

    private function legacyHasSeminarFlag(int $telegramUserId, \TelegramHost\Cache\SyncCache $cache): bool
    {
        $account = $this->get($telegramUserId);
        if ($account === null) {
            return false;
        }

        $profile = $this->decodeJsonObject($account['profile_json'] ?? null);
        if (is_array($profile) && ! empty($profile['has_seminar'])) {
            return true;
        }

        foreach ($cache->seminars() as $seminar) {
            $productId = (int) ($seminar['product_id'] ?? 0);
            if ($productId > 0 && $this->ownsProduct($telegramUserId, $productId)) {
                return true;
            }
        }

        return false;
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

    /**
     * Whether to call Iran account/fetch (identity not on host yet, or snapshot stale).
     */
    public function shouldAttemptIranPull(int $telegramUserId, int $minAgeVerifiedSeconds, int $minAgeUnverifiedSeconds): bool
    {
        if ($this->isVerified($telegramUserId)) {
            return $this->shouldRefreshSnapshot($telegramUserId, $minAgeVerifiedSeconds);
        }

        $account = $this->get($telegramUserId);
        if ($account === null) {
            return true;
        }

        return $this->isStale((string) ($account['updated_at'] ?? ''), $minAgeUnverifiedSeconds);
    }

    public function recordPullAttempt(int $telegramUserId): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (telegram_user_id, is_bot_admin, updated_at)
             VALUES (:id, 0, NOW())
             ON DUPLICATE KEY UPDATE updated_at = NOW()',
        );
        $stmt->execute(['id' => $telegramUserId]);
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

    private function isStale(string $updatedAt, int $minAgeSeconds): bool
    {
        $ts = strtotime($updatedAt);
        if ($ts === false || $ts <= 0) {
            return true;
        }

        return (time() - $ts) >= $minAgeSeconds;
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
