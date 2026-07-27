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
    public function __construct(private readonly \PDO $pdo) {}

    /** @param list<int> $ownedProductIds */
    public function store(string $mobile, array $ownedProductIds, ?string $displayName): void
    {
        $mobile = trim($mobile);
        if ($mobile === '') {
            return;
        }

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO telegram_pending_access_by_mobile (mobile, owned_product_ids, display_name, updated_at)
                 VALUES (:mobile, :owned, :name, NOW())
                 ON DUPLICATE KEY UPDATE owned_product_ids = :owned2, display_name = COALESCE(:name2, display_name), updated_at = NOW()',
            );
            $ownedJson = json_encode(array_values(array_unique($ownedProductIds)), JSON_UNESCAPED_UNICODE);
            $stmt->execute([
                'mobile' => $mobile,
                'owned' => $ownedJson,
                'name' => $displayName,
                'owned2' => $ownedJson,
                'name2' => $displayName,
            ]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access store: '.$e->getMessage());
        }
    }

    /** @return array{owned_product_ids: list<int>, display_name: ?string}|null */
    public function get(string $mobile): ?array
    {
        $mobile = trim($mobile);
        if ($mobile === '') {
            return null;
        }

        try {
            $stmt = $this->pdo->prepare(
                'SELECT owned_product_ids, display_name FROM telegram_pending_access_by_mobile WHERE mobile = :mobile',
            );
            $stmt->execute(['mobile' => $mobile]);
            $row = $stmt->fetch();
            if ($row === false) {
                return null;
            }

            $decoded = json_decode((string) ($row['owned_product_ids'] ?? '[]'), true);
            $ids = is_array($decoded) ? array_values(array_map('intval', $decoded)) : [];

            return [
                'owned_product_ids' => $ids,
                'display_name' => is_string($row['display_name'] ?? null) && $row['display_name'] !== ''
                    ? $row['display_name']
                    : null,
            ];
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access get: '.$e->getMessage());

            return null;
        }
    }
}
