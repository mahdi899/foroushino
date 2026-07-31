<?php

declare(strict_types=1);

namespace TelegramHost\Account;

/**
 * Local mirror of Telegram-linked users — identity, entitlements, and
 * pre-rendered menu payloads. Updated via push from Iran or account/fetch pull.
 */
final class AccountCache
{
    /** @var array<int, array<string, mixed>|null> */
    private array $rowMemo = [];

    /** @var array<int, array<string, mixed>|false> */
    private array $ownedPresentsMemo = [];

    public function __construct(private readonly \PDO $pdo) {}

    /** @return array<string, mixed>|null */
    public function get(int $telegramUserId): ?array
    {
        if (array_key_exists($telegramUserId, $this->rowMemo)) {
            return $this->rowMemo[$telegramUserId];
        }

        $stmt = $this->pdo->prepare('SELECT * FROM telegram_accounts_cache WHERE telegram_user_id = :id');
        $stmt->execute(['id' => $telegramUserId]);
        $row = $stmt->fetch();
        $resolved = $row === false ? null : $row;
        $this->rowMemo[$telegramUserId] = $resolved;

        return $resolved;
    }

    /** @return array<string, mixed>|null */
    public function findVerifiedByMobile(string $mobile, ?int $telegramUserId = null): ?array
    {
        $mobile = trim($mobile);
        if ($mobile === '') {
            return null;
        }

        $sql = 'SELECT * FROM telegram_accounts_cache
                WHERE mobile = :mobile AND mobile_verified_at IS NOT NULL';
        $params = ['mobile' => $mobile];
        if ($telegramUserId !== null && $telegramUserId > 0) {
            $sql .= ' AND telegram_user_id = :id';
            $params['id'] = $telegramUserId;
        }
        $sql .= ' ORDER BY updated_at DESC LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /** @param array<string, mixed> $account */
    public function store(int $telegramUserId, array $account): void
    {
        $this->ensureSatColumn();
        $this->ensureVerificationLevelColumn();
        $snapshot = is_array($account['snapshot'] ?? null) ? $account['snapshot'] : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (
                telegram_user_id, user_id, mobile, mobile_verified_at, display_name, verification_level, is_bot_admin,
                snapshot_revision, owned_product_ids, profile_json, referral_json, family_json, owned_presents_json, sat_json,
                snapshot_synced_at, updated_at
             ) VALUES (
                :id, :user_id, :mobile, :verified_at, :display_name, :verification_level, :is_admin,
                :snap_rev, :owned, :profile, :referral, :family, :presents, :sat,
                :snap_at, NOW()
             )
             ON DUPLICATE KEY UPDATE
                user_id = :user_id2,
                mobile = :mobile2,
                mobile_verified_at = :verified_at2,
                display_name = :display_name2,
                verification_level = IF(:verification_level2 IS NOT NULL, :verification_level2, verification_level),
                is_bot_admin = :is_admin2,
                snapshot_revision = COALESCE(:snap_rev2, snapshot_revision),
                owned_product_ids = COALESCE(:owned2, owned_product_ids),
                profile_json = IF(:profile2 IS NOT NULL, :profile2, profile_json),
                referral_json = IF(:referral2 IS NOT NULL, :referral2, referral_json),
                family_json = IF(:family2 IS NOT NULL, :family2, family_json),
                owned_presents_json = IF(:presents2 IS NOT NULL, :presents2, owned_presents_json),
                sat_json = IF(:sat2 IS NOT NULL, :sat2, sat_json),
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
        $verificationLevel = isset($account['verification_level'])
            ? max(1, (int) $account['verification_level'])
            : null;

        if ($snapshot !== null) {
            $snapRev = (string) ($snapshot['revision'] ?? '');
            if (isset($snapshot['owned_product_ids'])) {
                $incoming = is_array($snapshot['owned_product_ids'])
                    ? array_values(array_map('intval', $snapshot['owned_product_ids']))
                    : [];
                $existing = $this->get($telegramUserId);
                $current = $existing !== null
                    ? $this->decodeIntList((string) ($existing['owned_product_ids'] ?? '[]'))
                    : [];
                if ($incoming === []) {
                    $ownedJson = $current !== [] ? json_encode($current, JSON_UNESCAPED_UNICODE) : null;
                } else {
                    $merged = array_values(array_unique(array_merge($current, $incoming)));
                    $ownedJson = json_encode($merged, JSON_UNESCAPED_UNICODE);
                }
            }
            $profile = $snapshot['profile'] ?? null;
            if (is_array($profile)) {
                $profileJson = json_encode($profile, JSON_UNESCAPED_UNICODE);
                if (isset($profile['verification_level'])) {
                    $verificationLevel = max(1, (int) $profile['verification_level']);
                }
            }
            if (isset($snapshot['referral'])) {
                $referralJson = json_encode($snapshot['referral'], JSON_UNESCAPED_UNICODE);
            }
            if (isset($snapshot['family'])) {
                $familyJson = json_encode($snapshot['family'], JSON_UNESCAPED_UNICODE);
            }
            if (isset($snapshot['owned_presents'])) {
                $presentsJson = json_encode($snapshot['owned_presents'], JSON_UNESCAPED_UNICODE);
            }
            if (isset($snapshot['sat'])) {
                $satJson = json_encode($snapshot['sat'], JSON_UNESCAPED_UNICODE);
            }
            $snapAt = date('Y-m-d H:i:s');
        }

        $params = [
            'id' => $telegramUserId,
            'user_id' => $account['user_id'] ?? null,
            'mobile' => $account['mobile'] ?? null,
            'verified_at' => $this->normalizeDateTime($account['mobile_verified_at'] ?? null),
            'display_name' => $account['display_name'] ?? null,
            'verification_level' => $verificationLevel ?? 1,
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
            'verification_level2' => $verificationLevel,
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

        unset($this->rowMemo[$telegramUserId], $this->ownedPresentsMemo[$telegramUserId]);

        $mobile = trim((string) ($params['mobile'] ?? ''));
        if ($mobile !== '') {
            $this->purgeDuplicateMobileRows($mobile, $telegramUserId);
        }
    }

    /**
     * Move a verified cache row from an old Telegram numeric ID to a new one
     * (user deleted Telegram and recreated with the same phone number).
     */
    public function rekeyTelegramUserId(int $oldId, int $newId): bool
    {
        if ($oldId <= 0 || $newId <= 0 || $oldId === $newId) {
            return false;
        }

        $legacy = $this->get($oldId);
        if ($legacy === null || empty($legacy['mobile_verified_at'])) {
            return false;
        }

        try {
            $this->pdo->beginTransaction();

            // Drop any empty stub already keyed by the new ID.
            $del = $this->pdo->prepare('DELETE FROM telegram_accounts_cache WHERE telegram_user_id = :id');
            $del->execute(['id' => $newId]);
            $delConv = $this->pdo->prepare('DELETE FROM conversations WHERE telegram_user_id = :id');
            $delConv->execute(['id' => $newId]);

            $this->ensureSatColumn();

            $insert = $this->pdo->prepare(
                'INSERT INTO telegram_accounts_cache (
                    telegram_user_id, user_id, mobile, mobile_verified_at, display_name, is_bot_admin,
                    snapshot_revision, owned_product_ids, profile_json, referral_json, family_json,
                    owned_presents_json, sat_json, snapshot_synced_at, updated_at
                 ) VALUES (
                    :id, :user_id, :mobile, :verified_at, :display_name, :is_admin,
                    :snap_rev, :owned, :profile, :referral, :family, :presents, :sat, :snap_at, NOW()
                 )',
            );
            $insert->execute([
                'id' => $newId,
                'user_id' => $legacy['user_id'] ?? null,
                'mobile' => $legacy['mobile'] ?? null,
                'verified_at' => $legacy['mobile_verified_at'] ?? null,
                'display_name' => $legacy['display_name'] ?? null,
                'is_admin' => (int) ($legacy['is_bot_admin'] ?? 0),
                'snap_rev' => $legacy['snapshot_revision'] ?? null,
                'owned' => $legacy['owned_product_ids'] ?? null,
                'profile' => $legacy['profile_json'] ?? null,
                'referral' => $legacy['referral_json'] ?? null,
                'family' => $legacy['family_json'] ?? null,
                'presents' => $legacy['owned_presents_json'] ?? null,
                'sat' => $legacy['sat_json'] ?? null,
                'snap_at' => $legacy['snapshot_synced_at'] ?? null,
            ]);

            $this->pdo->prepare('DELETE FROM telegram_accounts_cache WHERE telegram_user_id = :id')
                ->execute(['id' => $oldId]);

            // Move conversation row if present.
            $conv = $this->pdo->prepare('SELECT state, context_json FROM conversations WHERE telegram_user_id = :id');
            $conv->execute(['id' => $oldId]);
            $convRow = $conv->fetch();
            if ($convRow !== false) {
                $this->pdo->prepare(
                    'INSERT INTO conversations (telegram_user_id, state, context_json, updated_at)
                     VALUES (:id, :state, :ctx, NOW())
                     ON DUPLICATE KEY UPDATE state = :state2, context_json = :ctx2, updated_at = NOW()',
                )->execute([
                    'id' => $newId,
                    'state' => 'idle',
                    'ctx' => $convRow['context_json'] ?? null,
                    'state2' => 'idle',
                    'ctx2' => $convRow['context_json'] ?? null,
                ]);
                $this->pdo->prepare('DELETE FROM conversations WHERE telegram_user_id = :id')
                    ->execute(['id' => $oldId]);
            }

            $mobile = trim((string) ($legacy['mobile'] ?? ''));
            if ($mobile !== '') {
                $this->purgeDuplicateMobileRows($mobile, $newId);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            error_log('[telegram-host] rekeyTelegramUserId failed: '.$e->getMessage());

            return false;
        }

        unset($this->rowMemo[$oldId], $this->rowMemo[$newId]);
        unset($this->ownedPresentsMemo[$oldId], $this->ownedPresentsMemo[$newId]);

        return true;
    }

    public function purgeDuplicateMobileRows(string $mobile, int $keepTelegramUserId): void
    {
        $mobile = trim($mobile);
        if ($mobile === '' || $keepTelegramUserId <= 0) {
            return;
        }

        try {
            $stmt = $this->pdo->prepare(
                'DELETE FROM telegram_accounts_cache
                 WHERE mobile = :mobile AND telegram_user_id != :keep',
            );
            $stmt->execute(['mobile' => $mobile, 'keep' => $keepTelegramUserId]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] purgeDuplicateMobileRows: '.$e->getMessage());
        }
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

    private function ensureVerificationLevelColumn(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        try {
            $columns = $this->pdo->query('SHOW COLUMNS FROM telegram_accounts_cache')->fetchAll(\PDO::FETCH_COLUMN);
            $existing = is_array($columns) ? array_map('strval', $columns) : [];
            if (! in_array('verification_level', $existing, true)) {
                $this->pdo->exec(
                    'ALTER TABLE telegram_accounts_cache ADD COLUMN verification_level TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER display_name',
                );
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
        $nameHint = is_string($displayNameHint) ? trim($displayNameHint) : '';
        if ($ownedProductIds === [] && $nameHint === '') {
            return;
        }

        $existing = $this->get($telegramUserId);
        $current = $existing !== null ? $this->decodeIntList((string) ($existing['owned_product_ids'] ?? '[]')) : [];
        $merged = $ownedProductIds === []
            ? $current
            : array_values(array_unique(array_merge($current, $ownedProductIds)));
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

    /**
     * Verified accounts to refresh from Iran — prioritise KYC/purchase mismatches.
     *
     * @return list<int>
     */
    public function telegramUserIdsForReconcile(int $limit): array
    {
        $this->ensureVerificationLevelColumn();
        $limit = max(1, min(200, $limit));

        $stmt = $this->pdo->prepare(
            'SELECT telegram_user_id FROM telegram_accounts_cache
             WHERE mobile_verified_at IS NOT NULL
             ORDER BY
               CASE
                 WHEN verification_level < 2
                   AND owned_product_ids IS NOT NULL
                   AND owned_product_ids <> :empty_json
                   AND owned_product_ids <> :empty_array
                 THEN 0
                 WHEN user_id IS NULL OR user_id = 0 THEN 1
                 WHEN snapshot_synced_at IS NULL THEN 2
                 ELSE 3
               END,
               COALESCE(snapshot_synced_at, updated_at) ASC,
               telegram_user_id ASC
             LIMIT '.$limit,
        );
        $stmt->execute([
            'empty_json' => '[]',
            'empty_array' => '[]',
        ]);

        $ids = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $id = (int) ($row['telegram_user_id'] ?? 0);
            if ($id > 0) {
                $ids[] = $id;
            }
        }

        return $ids;
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

        $columnLevel = (int) ($account['verification_level'] ?? 0);
        if ($columnLevel >= 2) {
            return true;
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

        return 0;
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

    public function hasRenderableProfile(int $telegramUserId): bool
    {
        $profile = $this->profileResponse($telegramUserId);
        if (! is_array($profile) || empty($profile['ok'])) {
            return false;
        }

        return trim((string) ($profile['text'] ?? '')) !== '';
    }

    /** @param array<string, mixed> $profile */
    public function storeProfileSnapshot(int $telegramUserId, array $profile): void
    {
        $profileJson = json_encode($profile, JSON_UNESCAPED_UNICODE);
        $verificationLevel = isset($profile['verification_level'])
            ? max(1, (int) $profile['verification_level'])
            : null;

        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (telegram_user_id, profile_json, verification_level, is_bot_admin, updated_at)
             VALUES (:id, :profile, :level, 0, NOW())
             ON DUPLICATE KEY UPDATE
                profile_json = :profile2,
                verification_level = IF(:level2 IS NOT NULL, :level2, verification_level),
                updated_at = NOW()',
        );
        $stmt->execute([
            'id' => $telegramUserId,
            'profile' => $profileJson,
            'level' => $verificationLevel ?? 1,
            'profile2' => $profileJson,
            'level2' => $verificationLevel,
        ]);

        unset($this->rowMemo[$telegramUserId]);
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
        if (! array_key_exists($telegramUserId, $this->ownedPresentsMemo)) {
            $stmt = $this->pdo->prepare(
                'SELECT owned_presents_json FROM telegram_accounts_cache WHERE telegram_user_id = :id LIMIT 1',
            );
            $stmt->execute(['id' => $telegramUserId]);
            $raw = $stmt->fetchColumn();
            $map = is_string($raw) && $raw !== '' ? $this->decodeJsonObject($raw) : null;
            $this->ownedPresentsMemo[$telegramUserId] = is_array($map) ? $map : false;
        }

        $map = $this->ownedPresentsMemo[$telegramUserId];
        if ($map === false) {
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
        if ($account === null || ! $this->hasRenderableProfile($telegramUserId)) {
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
