<?php

namespace App\Modules\TelegramBot\Services;

use Illuminate\Support\Facades\RateLimiter;

/**
 * Caps how many updates a single Telegram user can trigger per window.
 * Over-limit updates should be skipped silently (no bot reply).
 */
class TelegramUserRateLimiter
{
    public function tooManyAttempts(int $telegramUserId): bool
    {
        $max = max(1, (int) config('telegram_bot.user_rate_limit.per_minute', 30));

        return RateLimiter::tooManyAttempts($this->key($telegramUserId), $max);
    }

    public function hit(int $telegramUserId): void
    {
        $decay = max(1, (int) config('telegram_bot.user_rate_limit.decay_seconds', 60));
        RateLimiter::hit($this->key($telegramUserId), $decay);
    }

    public function remaining(int $telegramUserId): int
    {
        $max = max(1, (int) config('telegram_bot.user_rate_limit.per_minute', 30));

        return RateLimiter::remaining($this->key($telegramUserId), $max);
    }

    private function key(int $telegramUserId): string
    {
        return 'telegram:user-rate:'.$telegramUserId;
    }
}
