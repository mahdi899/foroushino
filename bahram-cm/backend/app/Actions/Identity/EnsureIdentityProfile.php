<?php

namespace App\Actions\Identity;

use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Models\User;
use App\Models\UserIdentityProfile;

class EnsureIdentityProfile
{
    public function __invoke(User $user): UserIdentityProfile
    {
        if ($user->relationLoaded('identityProfile') && $user->identityProfile) {
            return $user->identityProfile;
        }

        $existing = UserIdentityProfile::query()->where('user_id', $user->id)->first();
        if ($existing) {
            $user->setRelation('identityProfile', $existing);

            return $existing;
        }

        $profile = $user->identityProfile()->create([
            'identity_status' => IdentityVerificationStatus::NotStarted,
            'verification_level' => 1,
            'mobile_ownership_status' => MobileOwnershipStatus::NotStarted,
            'ownership_failed_attempts' => 0,
        ]);

        $user->setRelation('identityProfile', $profile);

        return $profile;
    }
}
