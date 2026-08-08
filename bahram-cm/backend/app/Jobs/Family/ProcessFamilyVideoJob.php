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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessFamilyVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 600;

    public function __construct(public int $mediaId) {}

    public function handle(): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit($this->timeout);
        }

        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media || $media->status === FamilyMediaStatus::Ready) {
            return;
        }

        // Become Ready even if ffmpeg/poster fails — same UX gate as images after store.
        $updates = ['status' => FamilyMediaStatus::Ready];
        $previewTempPath = null;

        if ($media->storage_path && FamilyFfmpeg::available()) {
            $disk = Storage::disk($media->disk);
            $localTmp = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-vid-'.uniqid('', true);
            $ext = pathinfo($media->storage_path, PATHINFO_EXTENSION) ?: 'mp4';
            $localVideo = "{$localTmp}.{$ext}";

            try {
                if (FamilyMediaStorage::downloadToTemp($disk, $media->storage_path, $localVideo)) {
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

                    $preview = FamilyFfmpeg::extractBlurPreview($localVideo, $media->storage_path);
                    if ($preview !== null) {
                        $previewTempPath = $preview['path'];
                        $bytes = file_get_contents($preview['path']);
                        if ($bytes !== false && $bytes !== '') {
                            $disk->put($preview['relative'], $bytes);
                            $updates['thumbnail_path'] = $preview['relative'];
                        }
                    }
                }
            } finally {
                if (is_file($localVideo)) {
                    @unlink($localVideo);
                }
                if ($previewTempPath && is_file($previewTempPath)) {
                    @unlink($previewTempPath);
                }
            }
        }

        $media->update($updates);
        $fresh = $media->fresh();

        if ($fresh && ! $fresh->thumbnail_path) {
            if (app()->environment(['local', 'testing'])) {
                GenerateFamilyThumbnailJob::dispatchSync($fresh->id);
            } else {
                GenerateFamilyThumbnailJob::dispatch($fresh->id)
                    ->onQueue(config('family.queues.media', 'family-media'));
            }
        }

        if ($fresh && $this->isRemoteDisk($fresh->disk)) {
            FamilyMediaStorage::purgeLocalPaths($fresh->storage_path, $fresh->thumbnail_path);
        }

        if (app()->environment(['local', 'testing'])) {
            CleanupFamilyTemporaryMediaJob::dispatchSync($media->id);
        } else {
            CleanupFamilyTemporaryMediaJob::dispatch($media->id)
                ->onQueue(config('family.queues.media', 'family-media'));
        }
    }

    public function failed(?\Throwable $exception): void
    {
        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media || $media->status === FamilyMediaStatus::Ready) {
            return;
        }

        Log::error('Family video processing failed', [
            'media_id' => $this->mediaId,
            'error' => $exception?->getMessage(),
        ]);

        // File is already on disk after transfer — mark Ready so the client
        // is not stuck polling until timeout when poster/ffprobe dies.
        $media->update([
            'status' => FamilyMediaStatus::Ready,
            'failure_reason' => null,
        ]);
    }

    private function isRemoteDisk(?string $disk): bool
    {
        return filled($disk) && ! in_array($disk, ['public', 'local'], true);
    }
}
