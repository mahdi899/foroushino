<?php

namespace App\Services\Auth;

/**
 * Verifies a Telegram WebApp `initData` payload's HMAC signature per the
 * official algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
class TelegramAuthVerifier
{
    /**
     * @return array{id: int, first_name: string, last_name: ?string, username: ?string, photo_url: ?string}
     *
     * @throws InvalidTelegramInitDataException
     */
    public function verify(string $initData): array
    {
        $botToken = (string) config('telegram.bot_token');

        if ($botToken === '') {
            throw new InvalidTelegramInitDataException('توکن ربات تلگرام تنظیم نشده است.');
        }

        parse_str($initData, $pairs);

        $hash = $pairs['hash'] ?? null;
        if (! is_string($hash) || $hash === '') {
            throw new InvalidTelegramInitDataException('امضای داده نامعتبر است.');
        }
        unset($pairs['hash']);

        ksort($pairs);
        $dataCheckString = collect($pairs)
            ->map(fn ($value, $key) => "{$key}={$value}")
            ->implode("\n");

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $computedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (! hash_equals($computedHash, $hash)) {
            throw new InvalidTelegramInitDataException('امضای داده معتبر نیست.');
        }

        $authDate = (int) ($pairs['auth_date'] ?? 0);
        $maxAge = (int) config('telegram.max_age', 86400);
        if ($authDate === 0 || (time() - $authDate) > $maxAge) {
            throw new InvalidTelegramInitDataException('داده ورود منقضی شده است، دوباره تلاش کنید.');
        }

        $user = json_decode($pairs['user'] ?? '{}', true, flags: JSON_THROW_ON_ERROR);

        if (! isset($user['id'])) {
            throw new InvalidTelegramInitDataException('اطلاعات کاربر تلگرام یافت نشد.');
        }

        return [
            'id' => (int) $user['id'],
            'first_name' => (string) ($user['first_name'] ?? ''),
            'last_name' => $user['last_name'] ?? null,
            'username' => $user['username'] ?? null,
            'photo_url' => $user['photo_url'] ?? null,
        ];
    }
}
