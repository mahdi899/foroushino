<?php

namespace App\Console\Commands;

use App\Models\UserProfile;
use App\Services\Student\StudentAvatarStorage;
use Illuminate\Console\Command;

/** Move legacy local `/storage/avatars/...` profile photos onto the download-host path. */
class MigrateStudentAvatarsToDownloadHost extends Command
{
    protected $signature = 'avatars:migrate-download-host
        {--dry-run : Show changes without uploading or updating the database}';

    protected $description = 'Push legacy student avatars from the app server to media/avatars on the download host';

    public function handle(StudentAvatarStorage $avatars): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $profiles = UserProfile::query()
            ->whereNotNull('avatar')
            ->where('avatar', 'like', '/storage/avatars/%')
            ->orderBy('id')
            ->get();

        if ($profiles->isEmpty()) {
            $this->info('No legacy student avatars found.');

            return self::SUCCESS;
        }

        $this->info(($dryRun ? '[dry-run] ' : '').'Found '.$profiles->count().' legacy avatar(s).');

        $migrated = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($profiles as $profile) {
            $old = (string) $profile->avatar;

            if ($dryRun) {
                $this->line("would migrate user_id={$profile->user_id} {$old}");
                $migrated++;

                continue;
            }

            try {
                $next = $avatars->migrateLegacyReference($old);
                if (! is_string($next) || $next === '') {
                    $this->warn("skipped user_id={$profile->user_id} (file missing): {$old}");
                    $skipped++;

                    continue;
                }

                $profile->update(['avatar' => $next]);
                $this->line("migrated user_id={$profile->user_id} {$old} -> {$next}");
                $migrated++;
            } catch (\Throwable $e) {
                $failed++;
                $this->error("failed user_id={$profile->user_id}: {$e->getMessage()}");
            }
        }

        $this->info("done migrated={$migrated} skipped={$skipped} failed={$failed}");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
