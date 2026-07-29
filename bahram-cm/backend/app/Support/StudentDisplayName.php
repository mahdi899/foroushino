<?php

namespace App\Support;

use App\Models\User;

final class StudentDisplayName
{
    public static function fromUser(User $user): string
    {
        $user->loadMissing(['profile', 'identityProfile']);

        $identity = $user->identityProfile;
        if ((int) ($identity?->verification_level ?? 0) >= 2) {
            $fromIdentity = trim(implode(' ', array_filter([
                $identity?->first_name,
                $identity?->last_name,
            ])));
            if ($fromIdentity !== '') {
                return $fromIdentity;
            }
        }

        $displayName = trim((string) $user->name);
        if ($displayName !== '') {
            return $displayName;
        }

        $fromProfile = trim(implode(' ', array_filter([
            $user->profile?->first_name,
            $user->profile?->last_name,
        ])));
        if ($fromProfile !== '') {
            return $fromProfile;
        }

        return 'دانشجو';
    }

    public static function forTelegramAccount(\App\Modules\TelegramBot\Models\TelegramAccount $account): string
    {
        $account->loadMissing(['user.profile', 'user.identityProfile']);
        if ($account->user instanceof User) {
            return self::fromUser($account->user);
        }

        $fromTelegram = trim((string) ($account->display_name
            ?: trim(($account->first_name ?? '').' '.($account->last_name ?? ''))));

        return $fromTelegram !== '' ? $fromTelegram : '—';
    }
}
