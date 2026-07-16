<?php

namespace App\Observers;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Services\Family\FamilyMediaSiteSync;

class FamilyMediaObserver
{
    public function __construct(private readonly FamilyMediaSiteSync $siteSync) {}

    public function saved(FamilyMedia $media): void
    {
        if ($media->status !== FamilyMediaStatus::Ready) {
            return;
        }

        if ($media->wasRecentlyCreated || $media->wasChanged('status') || $media->wasChanged('storage_path')) {
            $this->siteSync->sync($media);
        }
    }
}
