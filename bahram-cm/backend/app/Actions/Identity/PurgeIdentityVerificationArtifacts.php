<?php

namespace App\Actions\Identity;

use App\Enums\IdentityVerificationStatus;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Services\Identity\IdentityArtifactStorage;

/**
 * Remove sensitive KYC files (national card image, selfie video) from disk.
 * Submission metadata stays for admin audit; only files are deleted.
 */
class PurgeIdentityVerificationArtifacts
{
    public function __construct(private readonly IdentityArtifactStorage $storage) {}

    public function __invoke(IdentityVerificationSubmission $submission): int
    {
        $submission->loadMissing('artifacts');
        $purged = 0;

        foreach ($submission->artifacts as $artifact) {
            $this->storage->delete($artifact);
            $artifact->delete();
            $purged++;
        }

        return $purged;
    }

    /**
     * Drop card/video files from every prior submission for this user.
     * Keeps only the resolved keeper submission's artifacts on disk.
     */
    public function purgeSupersededForUser(User $user, int $keepSubmissionId): int
    {
        $previousSubmissions = IdentityVerificationSubmission::query()
            ->where('user_id', $user->id)
            ->where('id', '!=', $keepSubmissionId)
            ->with('artifacts')
            ->get();

        $purged = 0;

        foreach ($previousSubmissions as $previous) {
            $purged += $this($previous);
        }

        return $purged;
    }

    /**
     * Pick which submission's files must survive a cleanup run.
     * Never prefer an empty draft over an active queue case.
     */
    public function resolveKeeperSubmission(int $userId): ?IdentityVerificationSubmission
    {
        $submissions = IdentityVerificationSubmission::query()
            ->where('user_id', $userId)
            ->withCount('artifacts')
            ->orderByDesc('version')
            ->orderByDesc('id')
            ->get();

        if ($submissions->isEmpty()) {
            return null;
        }

        foreach ([
            [IdentityVerificationStatus::Submitted, IdentityVerificationStatus::UnderReview],
            [IdentityVerificationStatus::Approved],
            [IdentityVerificationStatus::NeedsCorrection, IdentityVerificationStatus::Rejected],
        ] as $statuses) {
            $match = $submissions->first(
                fn (IdentityVerificationSubmission $s) => in_array($s->status, $statuses, true)
                    && (int) $s->artifacts_count > 0,
            );

            if ($match) {
                return $match;
            }
        }

        $withArtifacts = $submissions->first(fn (IdentityVerificationSubmission $s) => (int) $s->artifacts_count > 0);
        if ($withArtifacts) {
            return $withArtifacts;
        }

        return $submissions->first();
    }
}
