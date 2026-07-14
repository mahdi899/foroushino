<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateFamilyThumbnailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $mediaId) {}

    public function handle(): void
    {
        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media) {
            return;
        }

        // V1 placeholder — thumbnail generation can be added with ffmpeg later.
        if ($media->status === FamilyMediaStatus::Processing) {
            $media->update(['status' => FamilyMediaStatus::Ready]);
        }
    }
}
