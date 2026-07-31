<?php

namespace App\Console\Commands;

use App\Services\SeminarAttendeeRosterSyncService;
use Illuminate\Console\Command;

class SyncSeminarAttendeeRoster extends Command
{
    protected $signature = 'seminar:sync-attendee-roster
                            {--file= : مسیر JSON لیست اعضا}
                            {--seminar-slug=smynar-zaafranyh-thran : اسلاگ سمینار}
                            {--dry-run : فقط گزارش، بدون تغییر دیتابیس}';

    protected $description = 'جایگزینی کامل اعضای سمینار از roster پایدار JSON (قابل اجرای مجدد در deploy)';

    public function handle(SeminarAttendeeRosterSyncService $sync): int
    {
        $file = $this->option('file')
            ?: base_path(SeminarAttendeeRosterSyncService::DEFAULT_JSON);

        if (! is_file($file)) {
            $this->error("فایل roster یافت نشد: {$file}");

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $this->info(($dryRun ? '[dry-run] ' : '')."Syncing attendees from {$file}");

        try {
            $stats = $sync->syncFromJson(
                $file,
                (string) $this->option('seminar-slug'),
                $dryRun,
            );
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->table(array_keys($stats), [array_values($stats)]);

        return self::SUCCESS;
    }
}
