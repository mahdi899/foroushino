<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'backup:database {--force : Run even if schedule time does not match}';

    protected $description = 'Create a scheduled database backup for Saat.';

    public function handle(BackupService $backup): int
    {
        if (! $this->option('force') && ! $backup->shouldRunScheduled()) {
            return self::SUCCESS;
        }

        $result = $this->option('force')
            ? $backup->runBackup()
            : $backup->runScheduled();

        if (! $result['ok']) {
            $this->error($result['message']);

            return self::FAILURE;
        }

        $this->info($result['message']);

        return self::SUCCESS;
    }
}
