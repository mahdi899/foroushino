<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use App\Services\DownloadHostBackupService;
use Illuminate\Console\Command;

class BackupWeeklyFullCommand extends Command
{
    protected $signature = 'backup:weekly-full {--force : Run even if schedule does not match} {--upload : Upload to download host after local backup}';

    protected $description = 'Create a weekly full backup (database + storage files) for Saat.';

    public function handle(BackupService $backup, DownloadHostBackupService $downloadHost): int
    {
        if (! $this->option('force') && ! $backup->shouldRunWeeklyScheduled()) {
            return self::SUCCESS;
        }

        $result = $this->option('force')
            ? $backup->runWeeklyFullBackup()
            : $backup->runWeeklyScheduled();

        if (! $result['ok']) {
            $this->error($result['message']);

            return self::FAILURE;
        }

        $this->info($result['message']);

        if ($this->option('upload')) {
            $upload = $downloadHost->uploadWeeklyBackup(true);
            if (! $upload['ok']) {
                $this->warn('آپلود هاست دانلود: '.$upload['message']);
            } else {
                $this->info($upload['message']);
            }
        }

        return self::SUCCESS;
    }
}
