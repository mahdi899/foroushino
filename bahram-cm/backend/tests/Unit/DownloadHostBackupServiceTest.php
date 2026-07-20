<?php

namespace Tests\Unit;

use App\Services\DownloadHostBackupService;
use Tests\TestCase;

class DownloadHostBackupServiceTest extends TestCase
{
    public function test_weekly_backup_day_matches_configured_weekday(): void
    {
        config(['bahram.backup.download_host.weekday' => now()->format('w')]);

        $this->assertTrue(app(DownloadHostBackupService::class)->isWeeklyBackupDay());
    }
}
