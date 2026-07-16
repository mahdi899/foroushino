<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramLoginToken;
use Illuminate\Support\Str;

class LoginTokenService
{
    public function create(TelegramAccount $account, ?User $user = null): array
    {
        $plain = Str::random(64);
        $ttl = (int) config('telegram_bot.login_token.ttl_minutes', 10);

        $token = TelegramLoginToken::query()->create([
            'telegram_account_id' => $account->id,
            'user_id' => $user?->id ?? $account->user_id,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addMinutes($ttl),
        ]);

        return [
            'token' => $plain,
            'model' => $token,
            'expires_at' => $token->expires_at,
        ];
    }

    public function consume(string $plainToken): ?TelegramLoginToken
    {
        $hash = hash('sha256', $plainToken);

        $token = TelegramLoginToken::query()
            ->where('token_hash', $hash)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($token === null) {
            return null;
        }

        $token->update(['used_at' => now()]);

        return $token->fresh(['account', 'user']);
    }
}
