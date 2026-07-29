<?php

namespace App\Observers;

use App\Models\User;
use App\Services\TelegramHostAccountSync;

class UserTelegramDisplayNameObserver
{
    public function saved(User $user): void
    {
        if (! $user->wasChanged('name')) {
            return;
        }

        app(TelegramHostAccountSync::class)->syncDisplayNamesForUser($user);
    }
}
