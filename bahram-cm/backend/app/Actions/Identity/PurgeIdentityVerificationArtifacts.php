<?php

namespace App\Actions\Identity;

use App\Models\IdentityVerificationSubmission;
use App\Services\Identity\IdentityArtifactStorage;

/**
 * Remove sensitive KYC files (national card image, selfie video) from disk
 * after expert approval — submission metadata stays for admin audit.
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
}
