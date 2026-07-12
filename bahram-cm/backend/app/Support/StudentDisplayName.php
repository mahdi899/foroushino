<?php

namespace App\Support;

use App\Models\User;

final class StudentDisplayName
{
    public static function fromUser(User $user): string
    {
        $user->loadMissing(['profile', 'identityProfile']);

        $fromIdentity = trim(implode(' ', array_filter([
            $user->identityProfile?->first_name,
            $user->identityProfile?->last_name,
        ])));

        if ($fromIdentity !== '') {
            return $fromIdentity;
        }

        $fromProfile = trim(implode(' ', array_filter([
            $user->profile?->first_name,
            $user->profile?->last_name,
        ])));

        if ($fromProfile !== '') {
            return $fromProfile;
        }

        $name = trim((string) $user->name);

        return $name !== '' ? $name : 'دانشجو';
    }
}
