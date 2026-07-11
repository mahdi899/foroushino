<?php

namespace App\Actions\Identity;

use App\Models\User;
use App\Models\UserIdentityProfile;

/** One-way copy of verified identity fields into the editable profile mirror. */
class SyncIdentityToUserProfile
{
    public function __invoke(User $user, UserIdentityProfile $identity): void
    {
        $fields = array_filter([
            'first_name' => $identity->first_name,
            'last_name' => $identity->last_name,
            'city' => $identity->city,
        ], fn ($value) => filled($value));

        if ($fields === []) {
            return;
        }

        $user->profile()->updateOrCreate(['user_id' => $user->id], $fields);

        $legalName = trim(implode(' ', array_filter([$identity->first_name, $identity->last_name])));
        if ($legalName === '') {
            return;
        }

        $currentName = trim((string) $user->name);
        if ($currentName === '' || $currentName === (string) $user->mobile) {
            $user->update(['name' => $legalName]);
        }
    }
}
