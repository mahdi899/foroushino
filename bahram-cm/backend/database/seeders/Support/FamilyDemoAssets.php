<?php

namespace Database\Seeders\Support;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\FamilyMedia;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

/**
 * Copies committed demo binaries into public storage and registers FamilyMedia rows.
 * Local dev: if FAMILY_MEDIA_CDN_URL is unset, falls back to APP_URL/storage.
 */
final class FamilyDemoAssets
{
    private const SOURCE_DIR = 'data/family-demo';

    private const PUBLIC_SUBDIR = 'media/family/demo';

    /** @var list<string> */
    private const FILES = [
        'demo-voice.mp3',
        'demo-video.mp4',
        'demo-image-1.jpg',
        'demo-image-2.jpg',
        'demo-image-3.jpg',
    ];

    /**
     * @return array{
     *   voice: FamilyMedia,
     *   video: FamilyMedia,
     *   videoVertical: FamilyMedia,
     *   image1: FamilyMedia,
     *   image2: FamilyMedia,
     *   image3: FamilyMedia,
     * }
     */
    public function deploy(User $uploader): array
    {
        $this->ensureLocalCdnFallback();
        $this->ensureStorageLink();
        $this->syncPublicCopies();

        return [
            'voice' => $this->media($uploader, 'demo-voice.mp3', FamilyMediaType::Voice, [
                'mime_type' => 'audio/mpeg',
                'duration' => 120,
                'waveform' => $this->waveform(),
            ]),
            'video' => $this->media($uploader, 'demo-video.mp4', FamilyMediaType::Video, [
                'mime_type' => 'video/mp4',
                'duration' => 5,
                'width' => 1280,
                'height' => 720,
            ]),
            'videoVertical' => $this->media($uploader, 'demo-video-vertical.mp4', FamilyMediaType::Video, [
                'mime_type' => 'video/mp4',
                'duration' => 5,
                'width' => 720,
                'height' => 1280,
                'source_filename' => 'demo-video.mp4',
            ]),
            'image1' => $this->media($uploader, 'demo-image-1.jpg', FamilyMediaType::Image, [
                'mime_type' => 'image/jpeg',
            ]),
            'image2' => $this->media($uploader, 'demo-image-2.jpg', FamilyMediaType::Image, [
                'mime_type' => 'image/jpeg',
            ]),
            'image3' => $this->media($uploader, 'demo-image-3.jpg', FamilyMediaType::Image, [
                'mime_type' => 'image/jpeg',
            ]),
        ];
    }

    private function ensureLocalCdnFallback(): void
    {
        if (filled(config('family.media.cdn_url'))) {
            return;
        }

        config([
            'family.media.cdn_url' => rtrim((string) config('app.url'), '/').'/storage',
        ]);
    }

    private function ensureStorageLink(): void
    {
        $link = public_path('storage');
        if (! is_link($link) && ! is_dir($link)) {
            Artisan::call('storage:link');
        }
    }

    private function syncPublicCopies(): void
    {
        $source = database_path(self::SOURCE_DIR);
        $target = storage_path('app/public/'.self::PUBLIC_SUBDIR);

        if (! is_dir($source)) {
            throw new \RuntimeException("پوشه دمو یافت نشد: {$source}");
        }

        File::ensureDirectoryExists($target);

        $legacy = storage_path('app/public/family-demo');
        if (is_dir($legacy)) {
            foreach (self::FILES as $filename) {
                $legacyFile = $legacy.DIRECTORY_SEPARATOR.$filename;
                if (is_file($legacyFile)) {
                    File::copy($legacyFile, $target.DIRECTORY_SEPARATOR.$filename);
                }
            }
            $legacyLandscape = $legacy.DIRECTORY_SEPARATOR.'demo-video.mp4';
            if (is_file($legacyLandscape)) {
                File::copy($legacyLandscape, $target.DIRECTORY_SEPARATOR.'demo-video-vertical.mp4');
            }
        }

        foreach (self::FILES as $filename) {
            $from = $source.DIRECTORY_SEPARATOR.$filename;
            if (! is_file($from)) {
                throw new \RuntimeException("فایل دمو یافت نشد: {$from}");
            }

            File::copy($from, $target.DIRECTORY_SEPARATOR.$filename);
        }

        // ویدیوی عمودی ۹:۱۶ — همان فایل افقی، با متادیتای portrait برای تست UI
        $landscapeVideo = $source.DIRECTORY_SEPARATOR.'demo-video.mp4';
        File::copy($landscapeVideo, $target.DIRECTORY_SEPARATOR.'demo-video-vertical.mp4');
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function media(User $uploader, string $filename, FamilyMediaType $type, array $meta): FamilyMedia
    {
        $storagePath = self::PUBLIC_SUBDIR.'/'.$filename;
        $absolute = storage_path('app/public/'.$storagePath);
        if (! is_file($absolute) && isset($meta['source_filename'])) {
            $sourceAbsolute = storage_path('app/public/'.self::PUBLIC_SUBDIR.'/'.$meta['source_filename']);
            if (is_file($sourceAbsolute)) {
                File::copy($sourceAbsolute, $absolute);
            }
        }
        $size = is_file($absolute) ? filesize($absolute) : null;

        $width = $meta['width'] ?? null;
        $height = $meta['height'] ?? null;
        if ($type === FamilyMediaType::Image && is_file($absolute)) {
            $dims = @getimagesize($absolute);
            if (is_array($dims)) {
                $width = $dims[0] ?: $width;
                $height = $dims[1] ?: $height;
            }
        }

        return FamilyMedia::query()->updateOrCreate(
            ['storage_path' => $storagePath],
            [
                'type' => $type->value,
                'disk' => 'public',
                'original_filename' => $filename,
                'mime_type' => $meta['mime_type'] ?? null,
                'size' => $size,
                'duration' => $meta['duration'] ?? null,
                'width' => $width,
                'height' => $height,
                'waveform' => $meta['waveform'] ?? null,
                'status' => FamilyMediaStatus::Ready,
                'uploaded_by' => $uploader->id,
            ],
        );
    }

    /** @return list<float> */
    private function waveform(): array
    {
        return array_map(
            static fn (int $i): float => round(0.18 + (($i * 7) % 11) * 0.06, 2),
            range(0, 31),
        );
    }
}
