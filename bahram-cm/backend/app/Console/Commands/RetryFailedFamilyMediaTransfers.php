<?php

namespace App\Console\Commands;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Services\Family\FamilyMediaIngestService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class RetryFailedFamilyMediaTransfers extends Command
{
    protected $signature = 'family:retry-failed-media-transfers
                            {--days=7 : Only retry media failed within this many days}
                            {--limit=50 : Maximum records to retry per run}';

    protected $description = 'Re-queue failed family media transfers while the local temp file still exists';

    public function handle(FamilyMediaIngestService $ingest): int
    {
        $days = max(1, (int) $this->option('days'));
        $limit = max(1, (int) $this->option('limit'));
        $tempDisk = Storage::disk(config('family.media.temp_disk', 'local'));

        $candidates = FamilyMedia::query()
            ->where('status', FamilyMediaStatus::Failed)
            ->whereNotNull('temp_path')
            ->where('updated_at', '>=', now()->subDays($days))
            ->orderBy('id')
            ->limit($limit)
            ->get();

        $retried = 0;
        $skipped = 0;

        foreach ($candidates as $media) {
            if (! $tempDisk->exists($media->temp_path)) {
                $skipped++;
                continue;
            }

            $ingest->retry($media);
            $retried++;
        }

        $this->info("Retried {$retried} failed family media transfer(s); skipped {$skipped} with missing temp file.");

        return self::SUCCESS;
    }
}
