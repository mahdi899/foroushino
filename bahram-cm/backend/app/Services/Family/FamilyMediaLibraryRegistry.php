<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Enums\MediaType;
use App\Models\FamilyMedia;
use App\Models\Media;
use App\Support\FamilyMediaPath;
use App\Support\LegacyMediaMap;
use Illuminate\Support\Facades\Storage;

/**
 * Keeps family uploads indexed in the shared media library (media table + manifest).
 * Files live under storage/app/public/media/family/ for local dev and FTP sync later.
 */
class FamilyMediaLibraryRegistry
{
    public const CATEGORY = 'خانواده';

    public function register(FamilyMedia $media): ?Media
    {
        if ($media->status !== FamilyMediaStatus::Ready) {
            return null;
        }

        if (! FamilyMediaPath::isLibraryPath($media->storage_path)) {
            return null;
        }

        $disk = $this->libraryDisk($media);
        if (! Storage::disk($disk)->exists($media->storage_path)) {
            return null;
        }

        $library = Media::query()->updateOrCreate(
            ['path' => $media->storage_path],
            [
                'disk' => $disk,
                'url' => null,
                'type' => $this->mediaType($media)->value,
                'mime' => $media->mime_type,
                'size' => $media->size,
                'width' => $media->width,
                'height' => $media->height,
                'alt_fa' => $this->altText($media),
                'original_filename' => $media->original_filename,
                'category' => self::CATEGORY,
                'is_private' => false,
                'uploaded_by' => $media->uploaded_by,
            ],
        );

        LegacyMediaMap::flush();

        return $library;
    }

    private function libraryDisk(FamilyMedia $media): string
    {
        if ($media->disk === 'public' || $media->disk === config('bahram.uploads.public_disk', 'public')) {
            return config('bahram.uploads.public_disk', 'public');
        }

        return $media->disk;
    }

    private function mediaType(FamilyMedia $media): MediaType
    {
        return match ($media->type) {
            FamilyMediaType::Image => MediaType::Image,
            FamilyMediaType::Video => MediaType::Video,
            FamilyMediaType::Voice => MediaType::Document,
            default => MediaType::Document,
        };
    }

    private function altText(FamilyMedia $media): ?string
    {
        $name = pathinfo((string) $media->original_filename, PATHINFO_FILENAME);

        return $name !== '' ? str_replace(['-', '_'], ' ', $name) : null;
    }
}
