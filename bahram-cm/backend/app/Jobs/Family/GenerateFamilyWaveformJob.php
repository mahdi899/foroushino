<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateFamilyWaveformJob implements ShouldQueue
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

        // Lightweight placeholder waveform for V1 (real DSP can replace later).
        $points = [];
        for ($i = 0; $i < 64; $i++) {
            $points[] = round(0.2 + (abs(sin($i * 0.37)) * 0.8), 3);
        }

        $media->update([
            'waveform' => $points,
            'status' => FamilyMediaStatus::Ready,
        ]);

        CleanupFamilyTemporaryMediaJob::dispatch($media->id)
            ->onQueue(config('family.queues.media', 'family-media'));
    }
}
