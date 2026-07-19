<?php

namespace App\Services\Family;

use App\Jobs\Family\ExportFamilyMediaToSiteLibraryJob;
use App\Models\FamilyMedia;
use App\Support\FamilyMediaStorage;
use Illuminate\Support\Facades\Storage;

/** Indexes ready family media in the site library — remote-first, no local duplicates. */
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
        $libraryDisk = $this->resolveLibraryDisk($sourceDisk);

        if ($sourceDisk === 'public' && $libraryDisk !== 'public') {
            $this->mirrorToDisk($sourceDisk, $libraryDisk, $media->storage_path);
        }

        $indexed = $this->registry->register($media->fresh(), $libraryDisk);

        if ($sourceDisk !== 'public') {
            FamilyMediaStorage::purgeLocalPublicCopy($media->storage_path);
        }

        if ($indexed) {
            ExportFamilyMediaToSiteLibraryJob::dispatch()->onQueue(config('family.queues.low', 'family-low'));
        }
    }

    private function resolveLibraryDisk(string $sourceDisk): string
    {
        if ($sourceDisk !== 'public' && $sourceDisk !== 'local') {
            return $sourceDisk;
        }

        return $this->settings->siteLibraryDisk();
    }

    private function mirrorToDisk(string $fromDisk, string $toDisk, string $path): void
    {
        if ($fromDisk === $toDisk) {
            return;
        }

        if (! Storage::disk($fromDisk)->exists($path)) {
            return;
        }

        $stream = Storage::disk($fromDisk)->readStream($path);
        if ($stream === false) {
            return;
        }

        try {
            Storage::disk($toDisk)->writeStream($path, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }
}
