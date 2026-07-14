<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class CleanupFamilyTemporaryMediaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $mediaId) {}

    public function handle(): void
    {
        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media || $media->status !== FamilyMediaStatus::Ready) {
            return;
        }

        if ($media->temp_path) {
            try {
                Storage::disk(config('family.media.temp_disk', 'local'))->delete($media->temp_path);
            } catch (\Throwable) {
            }

            $media->update(['temp_path' => null]);
        }
    }
}
