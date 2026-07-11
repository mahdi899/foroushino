<?php

namespace App\Actions\Identity;

use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Models\IdentityVerificationOverride;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\AdminAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OverrideVerificationLevel
{
    public function __construct(
        private readonly AdminAuditLogger $audit,
        private readonly SuspendSatMembership $suspendSat,
    ) {}

    public function __invoke(User $actor, User $student, int $newLevel, string $reason): UserIdentityProfile
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => ['دلیل تغییر سطح الزامی است.'],
            ]);
        }

        if (! in_array($newLevel, [1, 2, 3], true)) {
            throw ValidationException::withMessages([
                'level' => ['سطح تأیید نامعتبر است.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $student, $newLevel, $reason) {
            $profile = (new EnsureIdentityProfile)($student);
            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

            $previous = (int) $profile->verification_level;

            if ($previous === $newLevel) {
                return $profile;
            }

            if ($newLevel >= 2) {
                $profile->identity_status = IdentityVerificationStatus::Approved;
                $profile->identity_verified_at ??= now();
                $profile->identity_verified_by ??= $actor->id;
            } else {
                $profile->identity_status = IdentityVerificationStatus::NotStarted;
                $profile->identity_verified_at = null;
                $profile->identity_verified_by = null;
            }

            if ($newLevel >= 3) {
                $profile->mobile_ownership_status = MobileOwnershipStatus::Verified;
                $profile->mobile_ownership_verified_at ??= now();
            } elseif ($previous >= 3 && $newLevel < 3) {
                $profile->mobile_ownership_status = MobileOwnershipStatus::NotStarted;
                $profile->mobile_ownership_verified_at = null;
                $profile->mobile_ownership_provider = null;
                $profile->ownership_failed_attempts = 0;
                $profile->ownership_locked_at = null;
            }

            $profile->verification_level = $newLevel;
            $profile->save();

            if ($previous >= 2 && $newLevel < 2) {
                ($this->suspendSat)($student, 'identity_level_override');
            }

            IdentityVerificationOverride::query()->create([
                'user_id' => $student->id,
                'actor_id' => $actor->id,
                'previous_level' => $previous,
                'new_level' => $newLevel,
                'reason' => $reason,
                'request_id' => request()?->header('X-Request-Id') ?: (string) Str::uuid(),
            ]);

            $this->audit->log($actor, 'identity.level_overridden', $student, [
                'student_id' => $student->id,
                'previous_level' => $previous,
                'new_level' => $newLevel,
            ]);

            return $profile->fresh();
        });
    }
}
