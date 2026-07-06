<?php

namespace App\Services;

use App\Models\Media;
use App\Support\LegacyMediaMap;
use App\Support\MediaPath;
use App\Support\MediaUrl;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class MediaService
{
    /** Store an admin media-library file on the configured public disk. */
    public function storePublic(
        UploadedFile $file,
        ?string $alt = null,
        ?int $userId = null,
        ?string $category = null,
    ): Media {
        $disk = config('bahram.uploads.public_disk', 'public');
        $path = MediaPath::publicObjectKey($file);

        Storage::disk($disk)->putFileAs(
            dirname($path),
            $file,
            basename($path),
            $this->storeOptions($disk),
        );

        [$width, $height] = $this->dimensions($file);

        $media = Media::create([
            'disk' => $disk,
            'path' => $path,
            'url' => null,
            'type' => $this->typeFromMime($file->getMimeType()),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'alt_fa' => $alt,
            'original_filename' => $file->getClientOriginalName(),
            'category' => $category ?: 'آپلود شده',
            'is_private' => false,
            'uploaded_by' => $userId,
        ]);

        LegacyMediaMap::flush();

        return $media;
    }

    /** Import a file from disk into the public library (static migration). */
    public function importPublicFile(
        string $absoluteSourcePath,
        string $legacyPath,
        ?string $alt = null,
        ?string $category = null,
        ?\DateTimeInterface $uploadedAt = null,
    ): Media {
        $disk = config('bahram.uploads.public_disk', 'public');
        $uploadedAt ??= \DateTimeImmutable::createFromFormat('U', (string) @filemtime($absoluteSourcePath)) ?: now();
        $path = MediaPath::publicObjectKeyFromPath($absoluteSourcePath, $uploadedAt);

        $stream = fopen($absoluteSourcePath, 'r');
        Storage::disk($disk)->put($path, $stream, $this->storeOptions($disk));
        if (is_resource($stream)) {
            fclose($stream);
        }

        $mime = mime_content_type($absoluteSourcePath) ?: 'application/octet-stream';
        [$width, $height] = $this->dimensionsFromPath($absoluteSourcePath, $mime);

        $media = Media::create([
            'disk' => $disk,
            'path' => $path,
            'url' => null,
            'type' => $this->typeFromMime($mime),
            'mime' => $mime,
            'size' => filesize($absoluteSourcePath) ?: null,
            'width' => $width,
            'height' => $height,
            'alt_fa' => $alt,
            'original_filename' => basename($absoluteSourcePath),
            'category' => $category ?: 'عمومی',
            'legacy_path' => $legacyPath,
            'is_private' => false,
            'uploaded_by' => null,
            'created_at' => $uploadedAt,
            'updated_at' => $uploadedAt,
        ]);

        LegacyMediaMap::flush();

        return $media;
    }

    /** Store a private patient photo + record the consent. */
    public function storePrivate(UploadedFile $file, array $consentMeta = []): Media
    {
        $disk = config('bahram.uploads.private_disk', 'local');
        $path = MediaPath::privateObjectKey($file);

        Storage::disk($disk)->putFileAs(
            dirname($path),
            $file,
            basename($path),
        );

        [$width, $height] = $this->dimensions($file);

        $media = Media::create([
            'disk' => $disk,
            'path' => $path,
            'url' => null,
            'type' => $this->typeFromMime($file->getMimeType()),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'original_filename' => $file->getClientOriginalName(),
            'category' => null,
            'is_private' => true,
        ]);

        return $media;
    }

    /** Persist a local file (post-optimization) into the public media library. */
    public function storeFromLocalFile(
        string $absolutePath,
        string $mime,
        ?string $alt = null,
        ?int $userId = null,
        ?string $category = null,
        ?string $originalFilename = null,
    ): Media {
        $disk = config('bahram.uploads.public_disk', 'public');
        $ext = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION) ?: 'bin');
        $path = sprintf('media/%s/%s.%s', now()->format('Y/m'), strtolower(\Illuminate\Support\Str::ulid()->toString()), $ext);

        $stream = fopen($absolutePath, 'r');
        Storage::disk($disk)->put($path, $stream, $this->storeOptions($disk));
        if (is_resource($stream)) {
            fclose($stream);
        }

        [$width, $height] = $this->dimensionsFromPath($absolutePath, $mime);

        $media = Media::create([
            'disk' => $disk,
            'path' => $path,
            'url' => null,
            'type' => $this->typeFromMime($mime),
            'mime' => $mime,
            'size' => filesize($absolutePath) ?: null,
            'width' => $width,
            'height' => $height,
            'alt_fa' => $alt,
            'original_filename' => $originalFilename ?? basename($absolutePath),
            'category' => $category ?: 'آپلود شده',
            'is_private' => false,
            'uploaded_by' => $userId,
        ]);

        LegacyMediaMap::flush();

        return $media;
    }

    /** Overwrite an existing public library file (same storage path / URL). */
    public function replaceFileInPlace(Media $media, string $absolutePath, string $mime, ?string $altFa = null): Media
    {
        abort_if($media->is_private, 422, 'Private media cannot be replaced.');

        $disk = Storage::disk($media->disk);
        $stream = fopen($absolutePath, 'r');
        $disk->put($media->path, $stream, $this->storeOptions($media->disk));
        if (is_resource($stream)) {
            fclose($stream);
        }

        [$width, $height] = $this->dimensionsFromPath($absolutePath, $mime);
        $payload = [
            'mime' => $mime,
            'size' => filesize($absolutePath) ?: ($disk->size($media->path) ?: null),
            'width' => $width,
            'height' => $height,
        ];
        if ($altFa !== null && trim($altFa) !== '') {
            $payload['alt_fa'] = trim($altFa);
        }
        $media->update($payload);
        LegacyMediaMap::flush();

        return $media->refresh();
    }

    public function delete(Media $media): void
    {
        $this->trash($media);
    }

    /** Soft-delete — file kept for TRASH_RETENTION_HOURS. */
    public function trash(Media $media): void
    {
        $media->delete();
        LegacyMediaMap::flush();
    }

    public function restore(int $id): Media
    {
        /** @var Media $media */
        $media = Media::onlyTrashed()->where('is_private', false)->findOrFail($id);

        $deadline = $media->deleted_at->copy()->addHours(Media::TRASH_RETENTION_HOURS);
        abort_if(now()->greaterThanOrEqualTo($deadline), 410, 'مهلت بازیابی این تصویر به پایان رسیده است.');

        $media->restore();
        LegacyMediaMap::flush();

        return $media->refresh();
    }

    public function forceDeleteMedia(Media $media): void
    {
        Storage::disk($media->disk)->delete($media->path);
        $media->forceDelete();
        LegacyMediaMap::flush();
    }

    public function purgeExpiredTrash(): int
    {
        $cutoff = now()->subHours(Media::TRASH_RETENTION_HOURS);
        $count = 0;

        Media::onlyTrashed()
            ->where('is_private', false)
            ->where('deleted_at', '<=', $cutoff)
            ->orderBy('id')
            ->chunkById(50, function ($items) use (&$count) {
                foreach ($items as $media) {
                    $this->forceDeleteMedia($media);
                    $count++;
                }
            });

        return $count;
    }

    public function updateMetadata(Media $media, string $altFa, ?string $category = null): Media
    {
        $payload = ['alt_fa' => $altFa];
        if ($category !== null) {
            $payload['category'] = $category;
        }
        $media->update($payload);
        $media->refresh();
        $this->forgetAltCache($media);

        return $media;
    }

    private function forgetAltCache(Media $media): void
    {
        $resolver = app(MediaAltResolver::class);
        if ($media->url) {
            $resolver->forget($media->url);
        }
        if ($media->path) {
            $resolver->forget('/storage/'.$media->path);
        }
        if ($media->legacy_path) {
            $resolver->forget($media->legacy_path);
        }
    }

    /** @return array<string, mixed> */
    private function storeOptions(string $disk): array
    {
        if (in_array($disk, ['s3', 'r2'], true)) {
            return ['visibility' => 'public'];
        }

        return [];
    }

    private function typeFromMime(?string $mime): string
    {
        if (! $mime) {
            return 'document';
        }
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }

        return 'document';
    }

    private function dimensions(UploadedFile $file): array
    {
        if (str_starts_with((string) $file->getMimeType(), 'image/')) {
            $size = @getimagesize($file->getRealPath());
            if ($size) {
                return [$size[0], $size[1]];
            }
        }

        return [null, null];
    }

    private function dimensionsFromPath(string $path, string $mime): array
    {
        if (str_starts_with($mime, 'image/')) {
            $size = @getimagesize($path);
            if ($size) {
                return [$size[0], $size[1]];
            }
        }

        return [null, null];
    }
}
