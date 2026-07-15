<?php

namespace App\Observers;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Services\Family\FamilyMediaLibraryRegistry;

class FamilyMediaObserver
{
    public function __construct(private readonly FamilyMediaLibraryRegistry $registry) {}

    public function saved(FamilyMedia $media): void
    {
        if ($media->status !== FamilyMediaStatus::Ready) {
            return;
        }

        if ($media->wasRecentlyCreated || $media->wasChanged('status') || $media->wasChanged('storage_path')) {
            $this->registry->register($media);
        }
    }
}
