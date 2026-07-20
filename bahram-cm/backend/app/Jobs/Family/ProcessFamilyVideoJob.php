<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Support\FamilyFfmpeg;
use App\Support\FamilyMediaStorage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

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

        $updates = ['status' => FamilyMediaStatus::Ready];

        if ($media->storage_path && FamilyFfmpeg::available()) {
            $disk = Storage::disk($media->disk);
            $localTmp = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-vid-'.uniqid('', true);
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

                if (is_file($localVideo)) {
                    $probe = FamilyFfmpeg::probe($localVideo);
                    if ($probe['duration'] !== null) {
                        $updates['duration'] = $probe['duration'];
                    }
                    if ($probe['width'] !== null) {
                        $updates['width'] = $probe['width'];
                    }
                    if ($probe['height'] !== null) {
                        $updates['height'] = $probe['height'];
                    }

                    if (FamilyFfmpeg::extractThumbnail($localVideo, $localThumb)) {
                        $thumbRelative = preg_replace('/\.[^.]+$/', '', $media->storage_path).'_thumb.jpg';
                        $disk->put($thumbRelative, file_get_contents($localThumb));
                        $updates['thumbnail_path'] = $thumbRelative;
                    }
                }
            } finally {
                foreach ([$localVideo, $localThumb] as $path) {
                    if (is_file($path)) {
                        @unlink($path);
                    }
                }
            }
        }

        $media->update($updates);
        $fresh = $media->fresh();

        if ($this->isRemoteDisk($fresh->disk)) {
            FamilyMediaStorage::purgeLocalPaths($fresh->storage_path, $fresh->thumbnail_path);
        }

        CleanupFamilyTemporaryMediaJob::dispatch($media->id)
            ->onQueue(config('family.queues.media', 'family-media'));
    }

    private function isRemoteDisk(?string $disk): bool
    {
        return filled($disk) && ! in_array($disk, ['public', 'local'], true);
    }
}
