<?php

namespace App\Modules\TelegramBot\Http\Controllers\Concerns;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Http\Request;

trait ResolvesHostTelegramAccount
{
    /** @return array<string, mixed> */
    private function hostPayload(Request $request): array
    {
        $payload = $request->attributes->get('host_payload');

        return is_array($payload) ? $payload : [];
    }

    private function productionBot(): TelegramBot
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        abort_if($bot === null, 500, 'Bot not configured.');

        return $bot;
    }

    private function resolveAccount(Request $request): ?TelegramAccount
    {
        $payload = $this->hostPayload($request);
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        if ($telegramUserId <= 0) {
            return null;
        }

        $bot = $this->productionBot();

        return $bot->accounts()->where('telegram_user_id', $telegramUserId)->first();
    }
}
