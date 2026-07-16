<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Exceptions\InvalidTelegramInitDataException;
use App\Modules\TelegramBot\Models\TelegramBot;

class MiniAppAuthService
{
    /**
     * @return array{id: int, first_name: string, last_name: ?string, username: ?string, photo_url: ?string}
     *
     * @throws InvalidTelegramInitDataException
     */
    public function verify(TelegramBot $bot, string $initData): array
    {
        $botToken = $bot->resolveToken();

        if (blank($botToken)) {
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
        $maxAge = (int) config('telegram_bot.miniapp.max_auth_age', 86400);
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
