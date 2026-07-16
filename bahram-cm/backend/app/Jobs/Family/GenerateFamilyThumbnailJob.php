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

/** Generates a still poster for video media when ProcessFamilyVideoJob did not. */
class GenerateFamilyThumbnailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $mediaId) {}

    public function handle(): void
    {
        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media || ! $media->storage_path || $media->thumbnail_path) {
            return;
        }

        if (! FamilyFfmpeg::available()) {
            if ($media->status === FamilyMediaStatus::Processing) {
                $media->update(['status' => FamilyMediaStatus::Ready]);
            }

            return;
        }

        $disk = Storage::disk($media->disk);
        $localTmp = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-thumb-'.uniqid('', true);
        $ext = pathinfo($media->storage_path, PATHINFO_EXTENSION) ?: 'mp4';
        $localVideo = "{$localTmp}.{$ext}";
        $localThumb = "{$localTmp}.jpg";

        try {
            $stream = $disk->readStream($media->storage_path);
            if ($stream) {
                file_put_contents($localVideo, stream_get_contents($stream));
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            if (is_file($localVideo) && FamilyFfmpeg::extractThumbnail($localVideo, $localThumb)) {
                $thumbRelative = preg_replace('/\.[^.]+$/', '', $media->storage_path).'_thumb.jpg';
                $disk->put($thumbRelative, file_get_contents($localThumb));
                $media->update([
                    'thumbnail_path' => $thumbRelative,
                    'status' => FamilyMediaStatus::Ready,
                ]);
            }
        } finally {
            foreach ([$localVideo, $localThumb] as $path) {
                if (is_file($path)) {
                    @unlink($path);
                }
            }
        }
    }
}
