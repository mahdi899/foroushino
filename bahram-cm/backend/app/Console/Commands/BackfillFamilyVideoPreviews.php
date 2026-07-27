<?php

namespace App\Console\Commands;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Jobs\Family\GenerateFamilyThumbnailJob;
use App\Models\FamilyMedia;
use Illuminate\Console\Command;

class BackfillFamilyVideoPreviews extends Command
{
    protected $signature = 'family:backfill-video-previews
                            {--limit=200 : Max videos to queue}
                            {--dry-run : List matches without dispatching}';

    protected $description = 'Queue blurred poster generation for family videos missing thumbnail_path';

    public function handle(): int
    {
        $limit = max(1, (int) $this->option('limit'));
        $dryRun = (bool) $this->option('dry-run');

        $query = FamilyMedia::query()
            ->where('type', FamilyMediaType::Video)
            ->where('status', FamilyMediaStatus::Ready)
            ->whereNotNull('storage_path')
            ->where(function ($q) {
                $q->whereNull('thumbnail_path')->orWhere('thumbnail_path', '');
            })
            ->orderBy('id')
            ->limit($limit);

        $ids = $query->pluck('id');
        if ($ids->isEmpty()) {
            $this->info('No videos missing posters.');

            return self::SUCCESS;
        }

        $this->info(($dryRun ? '[dry-run] ' : '')."Found {$ids->count()} video(s) without poster.");

        if ($dryRun) {
            $this->line($ids->implode(', '));

            return self::SUCCESS;
        }

        $queue = config('family.queues.media', 'family-media');
        foreach ($ids as $id) {
            GenerateFamilyThumbnailJob::dispatch((int) $id)->onQueue($queue);
        }

        $this->info("Queued {$ids->count()} GenerateFamilyThumbnailJob(s) on [{$queue}].");

        return self::SUCCESS;
    }
}
