<?php

namespace App\Support;

use App\Models\User;
use App\Modules\TelegramBot\Services\DisplayNameValidator;

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
                return self::safeLabel($fromIdentity);
            }
        }

        $displayName = trim((string) $user->name);
        if ($displayName !== '') {
            return self::safeLabel($displayName);
        }

        $fromProfile = trim(implode(' ', array_filter([
            $user->profile?->first_name,
            $user->profile?->last_name,
        ])));
        if ($fromProfile !== '') {
            return self::safeLabel($fromProfile);
        }

        return 'دانشجو';
    }

  /** True when the account still has the OTP placeholder label and no legal first/last name. */
    public static function needsDisplayName(User $user): bool
    {
        $user->loadMissing(['profile', 'identityProfile']);

        $identity = $user->identityProfile;
        if ((int) ($identity?->verification_level ?? 0) >= 2) {
            $fromIdentity = trim(implode(' ', array_filter([
                $identity?->first_name,
                $identity?->last_name,
            ])));
            if ($fromIdentity !== '') {
                return false;
            }
        }

        $first = trim((string) ($user->profile?->first_name ?? ''));
        $last = trim((string) ($user->profile?->last_name ?? ''));
        if ($first !== '' && $last !== '') {
            return false;
        }

        $name = trim((string) $user->name);
        if ($name !== '' && $name !== 'دانشجو') {
            return false;
        }

        return true;
    }

    public static function forTelegramAccount(\App\Modules\TelegramBot\Models\TelegramAccount $account): string
    {
        $account->loadMissing(['user.profile', 'user.identityProfile']);
        if ($account->user instanceof User) {
            return self::fromUser($account->user);
        }

        $fromTelegram = trim((string) ($account->display_name
            ?: trim(($account->first_name ?? '').' '.($account->last_name ?? ''))));

        return $fromTelegram !== '' ? self::safeLabel($fromTelegram, '—') : '—';
    }

    private static function safeLabel(string $name, string $fallback = 'دانشجو'): string
    {
        $sanitized = (new DisplayNameValidator())->sanitize($name);

        return $sanitized ?? $fallback;
    }
}
