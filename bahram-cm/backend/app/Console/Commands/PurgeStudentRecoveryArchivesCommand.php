<?php

namespace App\Console\Commands;

use App\Services\StudentRecoveryPurgeService;
use Illuminate\Console\Command;

class PurgeStudentRecoveryArchivesCommand extends Command
{
    protected $signature = 'students:purge-recovery-archives {--limit=100 : Max archives to purge per run}';

    protected $description = 'Permanently delete expired student recovery snapshots (default retention: 30 days)';

    public function handle(StudentRecoveryPurgeService $purge): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $result = $purge->purgeExpired($limit);

        $this->info("Purged {$result['purged']} student recovery archive(s).");

        return self::SUCCESS;
    }
}
