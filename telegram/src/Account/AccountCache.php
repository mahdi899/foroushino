<?php

declare(strict_types=1);

namespace TelegramHost\Account;

/** Local mirror of the linked account — refreshed live via account/fetch or otp/verify. */
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
        $stmt = $this->pdo->prepare(
            'INSERT INTO telegram_accounts_cache (telegram_user_id, user_id, mobile, mobile_verified_at, display_name, is_bot_admin, updated_at)
             VALUES (:id, :user_id, :mobile, :verified_at, :display_name, :is_admin, NOW())
             ON DUPLICATE KEY UPDATE user_id = :user_id2, mobile = :mobile2, mobile_verified_at = :verified_at2,
                display_name = :display_name2, is_bot_admin = :is_admin2, updated_at = NOW()',
        );

        $params = [
            'id' => $telegramUserId,
            'user_id' => $account['user_id'] ?? null,
            'mobile' => $account['mobile'] ?? null,
            'verified_at' => $account['mobile_verified_at'] ?? null,
            'display_name' => $account['display_name'] ?? null,
            'is_admin' => ! empty($account['is_bot_admin']) ? 1 : 0,
        ];
        $stmt->execute(array_merge($params, [
            'user_id2' => $params['user_id'],
            'mobile2' => $params['mobile'],
            'verified_at2' => $params['verified_at'],
            'display_name2' => $params['display_name'],
            'is_admin2' => $params['is_admin'],
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
}
