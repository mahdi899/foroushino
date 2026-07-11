<?php

namespace App\Actions\Identity;

use App\Enums\IdentityVerificationStatus;
use App\Models\IdentityVerificationSubmission;
use App\Models\UserIdentityProfile;
use App\Support\IdentityVerificationMessages;
use Illuminate\Validation\ValidationException;

final class IdentitySubmissionGuard
{
    /** @var list<IdentityVerificationStatus> */
    private const LOCKED_PROFILE_STATUSES = [
        IdentityVerificationStatus::Submitted,
        IdentityVerificationStatus::UnderReview,
        IdentityVerificationStatus::Approved,
    ];

    /** @var list<IdentityVerificationStatus> */
    private const ACTIVE_SUBMISSION_STATUSES = [
        IdentityVerificationStatus::Submitted,
        IdentityVerificationStatus::UnderReview,
    ];

    public static function profileIsLocked(UserIdentityProfile $profile): bool
    {
        return in_array($profile->identity_status, self::LOCKED_PROFILE_STATUSES, true);
    }

    public static function userHasActiveSubmission(int $userId): bool
    {
        return IdentityVerificationSubmission::query()
            ->where('user_id', $userId)
            ->whereIn('status', self::ACTIVE_SUBMISSION_STATUSES)
            ->exists();
    }

    public static function isLocked(UserIdentityProfile $profile, int $userId): bool
    {
        return self::profileIsLocked($profile) || self::userHasActiveSubmission($userId);
    }

    /** @throws ValidationException */
    public static function ensureEditable(UserIdentityProfile $profile, int $userId): void
    {
        if (self::isLocked($profile, $userId)) {
            throw ValidationException::withMessages([
                'status' => [IdentityVerificationMessages::STATUS_LOCKED],
            ]);
        }
    }
}
