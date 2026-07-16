<?php

namespace App\Services\Family;

use App\Jobs\Family\ExportFamilyMediaToSiteLibraryJob;
use App\Models\FamilyMedia;
use Illuminate\Support\Facades\Storage;

/** Mirrors ready family media into the site library disk and indexes the media table. */
class FamilyMediaSiteSync
{
    public function __construct(
        private readonly FamilyMediaSettingsService $settings,
        private readonly FamilyMediaLibraryRegistry $registry,
    ) {}

    public function sync(FamilyMedia $media): void
    {
        if (! $this->settings->syncToSiteLibrary()) {
            return;
        }

        if (! $media->storage_path) {
            return;
        }

        $sourceDisk = (string) $media->disk;
        $targetDisk = $this->settings->siteLibraryDisk();

        if ($sourceDisk !== $targetDisk && Storage::disk($sourceDisk)->exists($media->storage_path)) {
            $stream = Storage::disk($sourceDisk)->readStream($media->storage_path);
            if ($stream !== false) {
                Storage::disk($targetDisk)->writeStream($media->storage_path, $stream);
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
        }

        $indexed = $this->registry->register($media->fresh(), $targetDisk);
        if ($indexed) {
            ExportFamilyMediaToSiteLibraryJob::dispatch()->onQueue(config('family.queues.low', 'family-low'));
        }
    }
}
