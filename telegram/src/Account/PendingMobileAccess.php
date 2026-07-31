<?php

declare(strict_types=1);

namespace TelegramHost\Account;

/**
 * Access pushed from Iran for a buyer *before* they ever start the bot
 * (e.g. purchased a course/seminar on the website only). Keyed by mobile
 * number so {@see HostRegistrationFlow::contact()} can merge it into
 * {@see AccountCache} the instant the user shares their phone number —
 * local DB lookup only, no network round trip, so access is granted the
 * moment they hit /start instead of waiting for a background reconcile.
 */
final class PendingMobileAccess
{
    private bool $schemaReady = false;

    public function __construct(private readonly \PDO $pdo) {}

    /**
     * @param  list<int>  $ownedProductIds
     * @param  array<string, mixed>|null  $snapshot  Full Iran snapshot (profile, presents, licenses).
     */
    public function store(
        string $mobile,
        array $ownedProductIds,
        ?string $displayName,
        ?int $userId = null,
        ?int $verificationLevel = null,
        ?array $snapshot = null,
    ): void {
        $mobile = trim($mobile);
        if ($mobile === '') {
            return;
        }

        $this->ensureSchema();

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO telegram_pending_access_by_mobile (
                    mobile, owned_product_ids, display_name, user_id, verification_level, snapshot_json, updated_at
                 ) VALUES (
                    :mobile, :owned, :name, :user_id, :level, :snapshot, NOW()
                 )
                 ON DUPLICATE KEY UPDATE
                    owned_product_ids = :owned2,
                    display_name = COALESCE(:name2, display_name),
                    user_id = COALESCE(:user_id2, user_id),
                    verification_level = COALESCE(:level2, verification_level),
                    snapshot_json = COALESCE(:snapshot2, snapshot_json),
                    updated_at = NOW()',
            );
            $ownedJson = json_encode(array_values(array_unique($ownedProductIds)), JSON_UNESCAPED_UNICODE);
            $snapshotJson = $snapshot !== null
                ? json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : null;
            $stmt->execute([
                'mobile' => $mobile,
                'owned' => $ownedJson,
                'name' => $displayName,
                'user_id' => $userId,
                'level' => $verificationLevel,
                'snapshot' => $snapshotJson,
                'owned2' => $ownedJson,
                'name2' => $displayName,
                'user_id2' => $userId,
                'level2' => $verificationLevel,
                'snapshot2' => $snapshotJson,
            ]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access store: '.$e->getMessage());
        }
    }

    /** @return array<string, mixed>|null */
    public function get(string $mobile): ?array
    {
        $mobile = trim($mobile);
        if ($mobile === '') {
            return null;
        }

        $this->ensureSchema();

        try {
            $stmt = $this->pdo->prepare(
                'SELECT owned_product_ids, display_name, user_id, verification_level, snapshot_json
                 FROM telegram_pending_access_by_mobile WHERE mobile = :mobile',
            );
            $stmt->execute(['mobile' => $mobile]);
            $row = $stmt->fetch();
            if ($row === false) {
                return null;
            }

            $decoded = json_decode((string) ($row['owned_product_ids'] ?? '[]'), true);
            $ids = is_array($decoded) ? array_values(array_map('intval', $decoded)) : [];
            $snapshot = null;
            if (is_string($row['snapshot_json'] ?? null) && $row['snapshot_json'] !== '') {
                $parsed = json_decode($row['snapshot_json'], true);
                $snapshot = is_array($parsed) ? $parsed : null;
            }

            return [
                'owned_product_ids' => $ids,
                'display_name' => is_string($row['display_name'] ?? null) && $row['display_name'] !== ''
                    ? $row['display_name']
                    : null,
                'user_id' => isset($row['user_id']) ? (int) $row['user_id'] : null,
                'verification_level' => isset($row['verification_level'])
                    ? max(1, (int) $row['verification_level'])
                    : 1,
                'snapshot' => $snapshot,
            ];
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access get: '.$e->getMessage());

            return null;
        }
    }

    public function applyToAccount(AccountCache $accounts, int $telegramUserId, string $mobile): bool
    {
        $pending = $this->get($mobile);
        if ($pending === null) {
            return false;
        }

        if (is_array($pending['snapshot'] ?? null)) {
            $accounts->store($telegramUserId, [
                'telegram_user_id' => $telegramUserId,
                'user_id' => $pending['user_id'] ?? null,
                'mobile' => $mobile,
                'display_name' => $pending['display_name'],
                'verification_level' => $pending['verification_level'] ?? 1,
                'snapshot' => $pending['snapshot'],
            ]);
        } else {
            $accounts->mergeOwnedProductIds(
                $telegramUserId,
                $pending['owned_product_ids'],
                $pending['display_name'],
            );
        }

        $this->delete($mobile);

        return true;
    }

    public function delete(string $mobile): void
    {
        $mobile = trim($mobile);
        if ($mobile === '') {
            return;
        }

        try {
            $stmt = $this->pdo->prepare('DELETE FROM telegram_pending_access_by_mobile WHERE mobile = :mobile');
            $stmt->execute(['mobile' => $mobile]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access delete: '.$e->getMessage());
        }
    }

    private function ensureSchema(): void
    {
        if ($this->schemaReady) {
            return;
        }

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS telegram_pending_access_by_mobile (
                mobile VARCHAR(20) NOT NULL PRIMARY KEY,
                owned_product_ids TEXT NULL,
                display_name VARCHAR(191) NULL,
                user_id BIGINT UNSIGNED NULL,
                verification_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
                snapshot_json MEDIUMTEXT NULL,
                updated_at DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
        );

        try {
            $columns = $this->pdo->query('SHOW COLUMNS FROM telegram_pending_access_by_mobile')->fetchAll(\PDO::FETCH_COLUMN);
            $existing = is_array($columns) ? array_map('strval', $columns) : [];
            if (! in_array('user_id', $existing, true)) {
                $this->pdo->exec('ALTER TABLE telegram_pending_access_by_mobile ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER display_name');
            }
            if (! in_array('verification_level', $existing, true)) {
                $this->pdo->exec('ALTER TABLE telegram_pending_access_by_mobile ADD COLUMN verification_level TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER user_id');
            }
            if (! in_array('snapshot_json', $existing, true)) {
                $this->pdo->exec('ALTER TABLE telegram_pending_access_by_mobile ADD COLUMN snapshot_json MEDIUMTEXT NULL AFTER verification_level');
            }
        } catch (\Throwable) {
        }

        $this->schemaReady = true;
    }
}
