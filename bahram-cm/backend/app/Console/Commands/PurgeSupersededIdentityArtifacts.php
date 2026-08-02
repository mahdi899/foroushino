<?php

namespace App\Console\Commands;

use App\Actions\Identity\PurgeIdentityVerificationArtifacts;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeSupersededIdentityArtifacts extends Command
{
    protected $signature = 'identity:purge-superseded-artifacts
                            {--dry-run : Report what would be deleted without removing files}
                            {--user= : Limit cleanup to a specific user id}';

    protected $description = 'Remove KYC card/video files from superseded identity submissions; keep only the latest version per user';

    public function handle(PurgeIdentityVerificationArtifacts $purge): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $userId = $this->option('user') ? (int) $this->option('user') : null;

        if ($dryRun) {
            $this->info('Dry run — no files will be deleted.');
        }

        $latestByUser = IdentityVerificationSubmission::query()
            ->select('user_id', DB::raw('MAX(version) as max_version'))
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->groupBy('user_id')
            ->pluck('max_version', 'user_id');

        $purgedArtifacts = 0;
        $affectedUsers = 0;

        foreach ($latestByUser as $uid => $maxVersion) {
            $keep = IdentityVerificationSubmission::query()
                ->where('user_id', $uid)
                ->where('version', $maxVersion)
                ->orderByDesc('id')
                ->first();

            if (! $keep) {
                continue;
            }

            $supersededCount = IdentityVerificationSubmission::query()
                ->where('user_id', $uid)
                ->where('id', '!=', $keep->id)
                ->whereHas('artifacts')
                ->count();

            if ($supersededCount === 0) {
                continue;
            }

            $affectedUsers++;

            if ($dryRun) {
                $artifactCount = IdentityVerificationSubmission::query()
                    ->where('user_id', $uid)
                    ->where('id', '!=', $keep->id)
                    ->withCount('artifacts')
                    ->get()
                    ->sum('artifacts_count');

                $purgedArtifacts += $artifactCount;
                $this->line("User #{$uid}: would purge {$artifactCount} artifact(s), keep submission #{$keep->id} (v{$keep->version})");

                continue;
            }

            $user = User::query()->find($uid);
            if (! $user) {
                continue;
            }

            $purgedArtifacts += $purge->purgeSupersededForUser($user, $keep->id);
            $this->line("User #{$uid}: purged superseded artifacts, kept submission #{$keep->id} (v{$keep->version})");
        }

        $this->table(
            ['Metric', 'Count'],
            [
                ['Users affected', $affectedUsers],
                ['Artifacts '.($dryRun ? 'to purge' : 'purged'), $purgedArtifacts],
            ],
        );

        return self::SUCCESS;
    }
}
