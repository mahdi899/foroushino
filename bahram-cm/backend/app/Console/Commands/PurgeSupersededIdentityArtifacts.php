<?php

namespace App\Console\Commands;

use App\Actions\Identity\PurgeIdentityVerificationArtifacts;
use App\Enums\IdentityVerificationStatus;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use Illuminate\Console\Command;

class PurgeSupersededIdentityArtifacts extends Command
{
    protected $signature = 'identity:purge-superseded-artifacts
                            {--dry-run : Report what would be deleted without removing files}
                            {--force : Required to actually delete files}
                            {--user= : Limit cleanup to a specific user id}';

    protected $description = 'Remove KYC files from superseded identity submissions (manual maintenance only)';

    public function handle(PurgeIdentityVerificationArtifacts $purge): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $userId = $this->option('user') ? (int) $this->option('user') : null;

        if (! $dryRun && ! $force) {
            $this->error('برای اجرای واقعی باید --force بدهید. پیش‌فرض فقط --dry-run است.');
            $dryRun = true;
        }

        if ($dryRun) {
            $this->warn('Dry run — no files will be deleted.');
        }

        $userIds = IdentityVerificationSubmission::query()
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->distinct()
            ->orderBy('user_id')
            ->pluck('user_id');

        $purgedArtifacts = 0;
        $affectedUsers = 0;

        foreach ($userIds as $uid) {
            $keep = $purge->resolveKeeperSubmission((int) $uid);

            if (! $keep) {
                continue;
            }

            $superseded = IdentityVerificationSubmission::query()
                ->where('user_id', $uid)
                ->where('id', '!=', $keep->id)
                ->whereHas('artifacts')
                ->withCount('artifacts')
                ->get();

            if ($superseded->isEmpty()) {
                continue;
            }

            $artifactCount = (int) $superseded->sum('artifacts_count');
            $affectedUsers++;

            $status = $keep->status instanceof IdentityVerificationStatus
                ? $keep->status->value
                : (string) $keep->status;

            if ($dryRun) {
                $purgedArtifacts += $artifactCount;
                $this->line("User #{$uid}: would purge {$artifactCount} artifact(s), keep submission #{$keep->id} (v{$keep->version}, {$status})");

                continue;
            }

            $user = User::query()->find($uid);
            if (! $user) {
                continue;
            }

            $purgedArtifacts += $purge->purgeSupersededForUser($user, $keep->id);
            $this->line("User #{$uid}: purged superseded artifacts, kept submission #{$keep->id} (v{$keep->version}, {$status})");
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
