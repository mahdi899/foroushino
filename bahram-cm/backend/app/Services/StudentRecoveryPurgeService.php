<?php

namespace App\Services;

use App\Models\StudentRecoveryArchive;

class StudentRecoveryPurgeService
{
    /**
     * Permanently remove recovery snapshots whose retention window has elapsed.
     *
     * @return array{purged: int}
     */
    public function purgeExpired(?int $limit = 100): array
    {
        $archives = StudentRecoveryArchive::query()
            ->whereNull('purged_at')
            ->where('purge_at', '<=', now())
            ->orderBy('purge_at')
            ->limit(max(1, $limit))
            ->get();

        $purged = 0;

        foreach ($archives as $archive) {
            $archive->update(['purged_at' => now()]);
            $archive->delete();
            $purged++;
        }

        return ['purged' => $purged];
    }
}
