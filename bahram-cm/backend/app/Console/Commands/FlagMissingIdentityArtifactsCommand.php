<?php

namespace App\Console\Commands;

use App\Actions\Identity\FlagMissingIdentityArtifacts;
use Illuminate\Console\Command;

class FlagMissingIdentityArtifactsCommand extends Command
{
    protected $signature = 'identity:flag-missing-artifacts
                            {--dry-run : Report affected queue cases without changing status}
                            {--notify : Send in-app notification and SMS to affected students}
                            {--force : Required with --notify to send messages}';

    protected $description = 'Move queue cases with missing KYC files to needs_correction so students can re-upload';

    public function handle(FlagMissingIdentityArtifacts $action): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $notify = (bool) $this->option('notify');
        $force = (bool) $this->option('force');

        if ($notify && ! $force && ! $dryRun) {
            $this->error('برای ارسال پیام باید --notify همراه --force باشد.');

            return self::FAILURE;
        }

        if ($dryRun) {
            $missing = $action->queueSubmissionsWithMissingArtifacts();
            $this->warn("Dry run — {$missing->count()} queue case(s) have missing artifact files.");

            foreach ($missing->take(20) as $submission) {
                $this->line("submission #{$submission->id} user #{$submission->user_id} v{$submission->version}");
            }

            if ($missing->count() > 20) {
                $this->line('...');
            }

            return self::SUCCESS;
        }

        $stats = $action->flagQueueSubmissions(notify: $notify && $force, dryRun: false);

        $this->table(
            ['Metric', 'Count'],
            [
                ['Scanned', $stats['scanned']],
                ['Flagged for re-upload', $stats['flagged']],
                ['Notified', $stats['notified']],
            ],
        );

        return self::SUCCESS;
    }
}
