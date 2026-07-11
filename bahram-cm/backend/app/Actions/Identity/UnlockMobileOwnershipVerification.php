<?php

namespace App\Actions\Identity;

use App\Enums\MobileOwnershipStatus;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\AdminAuditLogger;
use Illuminate\Support\Facades\DB;

class UnlockMobileOwnershipVerification
{
    public function __construct(private readonly AdminAuditLogger $audit) {}

    public function __invoke(User $actor, User $student): UserIdentityProfile
    {
        return DB::transaction(function () use ($actor, $student) {
            $profile = $student->identityProfile;
            abort_if(! $profile, 404);

            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

            $profile->mobile_ownership_status = MobileOwnershipStatus::NotStarted;
            $profile->ownership_failed_attempts = 0;
            $profile->ownership_locked_at = null;
            $profile->save();
            $profile->syncVerificationLevel();

            $this->audit->log($actor, 'identity.ownership_unlocked', $student, [
                'student_id' => $student->id,
                'profile_id' => $profile->id,
            ]);

            return $profile;
        });
    }
}
