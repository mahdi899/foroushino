<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessFamilyVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $mediaId) {}

    public function handle(): void
    {
        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media || $media->status === FamilyMediaStatus::Ready) {
            return;
        }

        // V1: mark ready without transcoding. Architecture leaves room for ffmpeg later.
        $media->update(['status' => FamilyMediaStatus::Ready]);

        CleanupFamilyTemporaryMediaJob::dispatch($media->id)
            ->onQueue(config('family.queues.media', 'family-media'));
    }
}
