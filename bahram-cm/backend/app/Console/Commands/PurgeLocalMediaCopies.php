<?php

namespace App\Console\Commands;

use App\Services\Media\LocalMediaCopyPurger;
use App\Support\MediaFtpConnection;
use Illuminate\Console\Command;

class PurgeLocalMediaCopies extends Command
{
    protected $signature = 'media:purge-local-copies
                            {--dry-run : Report what would be deleted without removing files}
                            {--limit=200 : Max DB rows per table to inspect}';

    protected $description = 'Remove origin-server copies after media lives on the download host (Bahram + Family)';

    public function handle(LocalMediaCopyPurger $purger): int
    {
        if (! MediaFtpConnection::isReady()) {
            $this->warn('Download host is not configured — only rows already marked remote will be purged.');
        }

        $dryRun = (bool) $this->option('dry-run');
        $limit = (int) $this->option('limit');

        if ($dryRun) {
            $this->info('Dry run — no files will be deleted.');
        }

        $stats = $purger->purge($limit, $dryRun);

        $this->table(
            ['Metric', 'Count'],
            [
                ['Purged (remote disk, local copy removed)', $stats['purged']],
                ['Reconciled (remote canonical, DB + local updated)', $stats['reconciled']],
                ['Skipped', $stats['skipped']],
                ['Failed', $stats['failed']],
            ],
        );

        foreach ($stats['errors'] as $error) {
            $this->error("{$error['scope']}#{$error['id']} {$error['path']}: {$error['message']}");
        }

        return $stats['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
