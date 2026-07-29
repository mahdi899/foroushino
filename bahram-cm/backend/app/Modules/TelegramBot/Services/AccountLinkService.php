<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramConversation;
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

    /**
     * When a user deletes Telegram and recreates with the same phone number,
     * telegram_user_id changes. Keep one telegram_accounts row keyed by mobile:
     * move the new ID onto the verified legacy row and drop the empty stub.
     *
     * @param  array{username?: ?string, first_name?: ?string, last_name?: ?string, language_code?: ?string}  $from
     */
    public function reclaimVerifiedAccountByMobile(
        TelegramBot $bot,
        TelegramAccount $stub,
        string $mobile,
        array $from = [],
    ): TelegramAccount {
        $mobile = trim($mobile);
        if ($mobile === '') {
            return $stub;
        }

        return DB::transaction(function () use ($bot, $stub, $mobile, $from): TelegramAccount {
            $stub = TelegramAccount::query()->lockForUpdate()->findOrFail($stub->id);

            // Already the verified owner of this mobile — nothing to reclaim.
            if ($stub->hasVerifiedMobile() && $stub->mobile === $mobile) {
                return $stub;
            }

            $legacy = TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('mobile', $mobile)
                ->whereNotNull('mobile_verified_at')
                ->where('id', '!=', $stub->id)
                ->lockForUpdate()
                ->orderByDesc('updated_at')
                ->first();

            if ($legacy === null) {
                return $stub;
            }

            $newTelegramUserId = (int) $stub->telegram_user_id;
            $oldTelegramUserId = (int) $legacy->telegram_user_id;

            if ($newTelegramUserId === $oldTelegramUserId) {
                return $legacy;
            }

            Log::channel('telegram')->info('Reclaiming verified Telegram account by mobile.', [
                'mobile' => $mobile,
                'legacy_account_id' => $legacy->id,
                'old_telegram_user_id' => $oldTelegramUserId,
                'new_telegram_user_id' => $newTelegramUserId,
                'stub_account_id' => $stub->id,
            ]);

            // Free unique (bot_id, telegram_user_id) for the new ID on the legacy row.
            TelegramConversation::query()->where('telegram_account_id', $stub->id)->delete();
            $stub->delete();

            $updates = [
                'telegram_user_id' => $newTelegramUserId,
            ];
            if (array_key_exists('username', $from) && filled($from['username'] ?? null)) {
                $updates['telegram_username'] = (string) $from['username'];
            }
            if (array_key_exists('first_name', $from) && filled($from['first_name'] ?? null)) {
                $updates['first_name'] = (string) $from['first_name'];
            }
            if (array_key_exists('last_name', $from) && filled($from['last_name'] ?? null)) {
                $updates['last_name'] = (string) $from['last_name'];
            }
            if (array_key_exists('language_code', $from) && filled($from['language_code'] ?? null)) {
                $updates['language_code'] = (string) $from['language_code'];
            }

            $legacy->update($updates);

            return $legacy->refresh();
        });
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
