<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'backup:database {--force : Run even if schedule time does not match}';

    protected $description = 'Create a database backup and optionally send it to Telegram.';

    public function handle(DatabaseBackupService $backup): int
    {
        if (! $this->option('force') && ! $backup->shouldRunScheduled()) {
            return self::SUCCESS;
        }

        $result = $this->option('force')
            ? $backup->runBackup(sendToTelegram: (bool) \App\Models\DatabaseBackupSetting::current()->send_to_telegram)
            : $backup->runScheduled();

        if (! $result['ok']) {
            $this->error($result['message']);

            return self::FAILURE;
        }

        $this->info($result['message']);

        return self::SUCCESS;
    }
}
