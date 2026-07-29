<?php

namespace App\Observers;

use App\Models\UserIdentityProfile;
use App\Services\TelegramHostAccountSync;

class UserIdentityProfileTelegramSyncObserver
{
    public function saved(UserIdentityProfile $profile): void
    {
        if (! $profile->wasChanged([
            'first_name',
            'last_name',
            'verification_level',
            'identity_status',
        ])) {
            return;
        }

        $profile->loadMissing('user');
        if ($profile->user === null) {
            return;
        }

        app(TelegramHostAccountSync::class)->syncDisplayNamesForUser($profile->user);
    }
}
