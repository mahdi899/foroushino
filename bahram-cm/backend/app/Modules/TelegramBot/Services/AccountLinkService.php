<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AccountLinkService
{
    public function findOrCreateAccount(
        TelegramBot $bot,
        int $telegramUserId,
        ?string $username = null,
        ?string $firstName = null,
        ?string $lastName = null,
        ?string $languageCode = null,
    ): TelegramAccount {
        return TelegramAccount::query()->firstOrCreate(
            [
                'telegram_bot_id' => $bot->id,
                'telegram_user_id' => $telegramUserId,
            ],
            [
                'telegram_username' => $username,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'language_code' => $languageCode,
            ],
        );
    }

    public function linkToUser(TelegramAccount $account, User $user, bool $reclaim = true): TelegramAccount
    {
        return DB::transaction(function () use ($account, $user, $reclaim): TelegramAccount {
            $existing = TelegramAccount::query()
                ->where('user_id', $user->id)
                ->where('id', '!=', $account->id)
                ->first();

            if ($existing !== null) {
                if (! $reclaim) {
                    throw new \RuntimeException('User already linked to another Telegram account.');
                }

                Log::channel('telegram')->info('Reclaiming site user link for new Telegram account.', [
                    'user_id' => $user->id,
                    'previous_telegram_account_id' => $existing->id,
                    'new_telegram_account_id' => $account->id,
                ]);

                $existing->update(['user_id' => null]);
            }

            $account->update(['user_id' => $user->id]);

            if (blank($user->mobile) && filled($account->mobile)) {
                $user->update([
                    'mobile' => $account->mobile,
                    'mobile_verified_at' => $account->mobile_verified_at ?? now(),
                ]);
            }

            return $account->refresh();
        });
    }
}
