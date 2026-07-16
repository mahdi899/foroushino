<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Support\FamilyFfmpeg;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

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

        $points = null;
        $duration = null;

        if ($media->storage_path && FamilyFfmpeg::available()) {
            $disk = Storage::disk($media->disk);
            $localTmp = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-aud-'.uniqid('', true);
            $ext = pathinfo($media->storage_path, PATHINFO_EXTENSION) ?: 'mp3';
            $localAudio = "{$localTmp}.{$ext}";

            try {
                $stream = $disk->readStream($media->storage_path);
                if ($stream) {
                    file_put_contents($localAudio, stream_get_contents($stream));
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }

                if (is_file($localAudio)) {
                    $points = FamilyFfmpeg::waveform($localAudio, 64);
                    $probe = FamilyFfmpeg::probe($localAudio);
                    $duration = $probe['duration'];
                }
            } finally {
                if (is_file($localAudio)) {
                    @unlink($localAudio);
                }
            }
        }

        // Fallback synthetic waveform when ffmpeg is unavailable.
        if ($points === null) {
            $points = [];
            for ($i = 0; $i < 64; $i++) {
                $points[] = round(0.2 + (abs(sin($i * 0.37)) * 0.8), 3);
            }
        }

        $media->update(array_filter([
            'waveform' => $points,
            'duration' => $duration,
            'status' => FamilyMediaStatus::Ready,
        ], fn ($v) => $v !== null));

        CleanupFamilyTemporaryMediaJob::dispatch($media->id)
            ->onQueue(config('family.queues.media', 'family-media'));
    }
}
