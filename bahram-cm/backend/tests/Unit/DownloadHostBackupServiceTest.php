<?php

namespace Tests\Unit;

use App\Services\DownloadHostBackupService;
use Carbon\Carbon;
use Illuminate\Contracts\Filesystem\Filesystem;
use Tests\TestCase;

class DownloadHostBackupServiceTest extends TestCase
{
    public function test_weekly_backup_day_matches_configured_weekday(): void
    {
        config(['bahram.backup.download_host.weekday' => now()->format('w')]);

        $this->assertTrue(app(DownloadHostBackupService::class)->isWeeklyBackupDay());
    }

    public function test_parse_folder_backup_date_from_date_and_datetime_folder_names(): void
    {
        $service = app(DownloadHostBackupService::class);

        $this->assertTrue(
            $service->parseFolderBackupDate('2026-08-02')?->isSameDay(Carbon::parse('2026-08-02')) ?? false,
        );
        $this->assertTrue(
            $service->parseFolderBackupDate('2026-08-02_153045')?->isSameDay(Carbon::parse('2026-08-02')) ?? false,
        );
        $this->assertNull($service->parseFolderBackupDate('a1b2c3d4e5f6'));
    }

    public function test_resolve_dated_folder_name_uses_date_then_datetime_suffix(): void
    {
        $service = app(DownloadHostBackupService::class);
        $disk = $this->createMock(Filesystem::class);

        $disk->method('exists')->willReturn(false);
        $disk->method('directories')->willReturn([]);
        $disk->method('allFiles')->willReturn([]);

        Carbon::setTestNow('2026-08-02 04:00:00');
        $this->assertSame('2026-08-02', $service->resolveDatedFolderName($disk, 'bahram'));

        $disk = $this->createMock(Filesystem::class);
        $disk->method('exists')->willReturn(true);

        Carbon::setTestNow('2026-08-02 15:30:45');
        $this->assertSame('2026-08-02_153045', $service->resolveDatedFolderName($disk, 'bahram'));

        Carbon::setTestNow();
    }
}
