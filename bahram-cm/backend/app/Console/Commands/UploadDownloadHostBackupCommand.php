<?php

namespace App\Console\Commands;

use App\Services\DownloadHostBackupService;
use Illuminate\Console\Command;

class UploadDownloadHostBackupCommand extends Command
{
    protected $signature = 'backup:upload-download-host {--force : Upload even if today is not the weekly backup day}';

    protected $description = 'Upload weekly database + media backup to the download host (FTP/CDN).';

    public function handle(DownloadHostBackupService $backup): int
    {
        $result = $backup->uploadWeeklyBackup((bool) $this->option('force'));

        if (! $result['ok']) {
            $this->error($result['message']);

            return self::FAILURE;
        }

        $this->info($result['message']);

        if (isset($result['manifest']['files']) && is_array($result['manifest']['files'])) {
            foreach ($result['manifest']['files'] as $entry) {
                if (is_array($entry) && isset($entry['url'])) {
                    $this->line((string) $entry['url']);
                }
            }
        }

        return self::SUCCESS;
    }
}
