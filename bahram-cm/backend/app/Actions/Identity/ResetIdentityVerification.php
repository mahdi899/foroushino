<?php

namespace App\Actions\Identity;

use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Models\IdentityVerificationOverride;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\AdminAuditLogger;
use App\Services\TelegramHostAccountSync;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResetIdentityVerification
{
    public function __construct(
        private readonly AdminAuditLogger $audit,
        private readonly SuspendSatMembership $suspendSat,
        private readonly TelegramHostAccountSync $telegramSync,
    ) {}

    public function __invoke(User $actor, User $student, string $reason): UserIdentityProfile
    {
        abort_if($student->is_admin, 404);

        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => ['دلیل بازنشانی الزامی است.'],
            ]);
        }

        $profile = DB::transaction(function () use ($actor, $student, $reason) {
            $profile = (new EnsureIdentityProfile)($student);
            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

            $previousLevel = (int) $profile->verification_level;

            $profile->fill([
                'first_name' => null,
                'last_name' => null,
                'father_name' => null,
                'national_code_encrypted' => null,
                'national_code_hash' => null,
                'date_of_birth' => null,
                'gender' => null,
                'city' => null,
                'identity_status' => IdentityVerificationStatus::NotStarted,
                'verification_level' => 1,
                'identity_verified_at' => null,
                'identity_verified_by' => null,
                'mobile_ownership_status' => MobileOwnershipStatus::NotStarted,
                'mobile_ownership_verified_at' => null,
                'mobile_ownership_provider' => null,
                'ownership_failed_attempts' => 0,
                'ownership_locked_at' => null,
            ]);
            $profile->save();

            if ($previousLevel >= 2) {
                ($this->suspendSat)($student, 'identity_reset');
            }

            IdentityVerificationOverride::query()->create([
                'user_id' => $student->id,
                'actor_id' => $actor->id,
                'previous_level' => $previousLevel,
                'new_level' => 1,
                'reason' => 'reset: '.$reason,
                'request_id' => request()?->header('X-Request-Id') ?: (string) Str::uuid(),
            ]);

            $this->audit->log($actor, 'identity.reset', $student, [
                'student_id' => $student->id,
                'previous_level' => $previousLevel,
                'reason' => $reason,
            ]);

            return $profile->fresh();
        });

        $this->telegramSync->syncAccessAfterDeletion($student->fresh(), $student->mobile, [], 'identity_reset');

        return $profile;
    }
}
