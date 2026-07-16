<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyMediaType;
use App\Models\FamilyMedia;
use App\Services\ImageOptimizerService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Prepares family image uploads (optimize → webp when enabled). */
class FamilyImageProcessor
{
    public function __construct(
        private readonly FamilyMediaSettingsService $settings,
        private readonly ImageOptimizerService $optimizer,
    ) {}

    /**
     * @return array{
     *     absolute_path: string,
     *     extension: string,
     *     mime_type: string,
     *     size: int,
     *     width: ?int,
     *     height: ?int,
     *     optimized: bool
     * }
     */
    public function prepare(FamilyMedia $media, string $tempRelativePath): array
    {
        $tempDisk = Storage::disk(config('family.media.temp_disk', 'local'));
        $absolute = $tempDisk->path($tempRelativePath);
        abort_unless(is_string($absolute) && is_file($absolute), 500, 'Temporary image missing.');

        $mime = mime_content_type($absolute) ?: (string) $media->mime_type ?: 'application/octet-stream';
        $originalExt = Str::lower(pathinfo((string) $media->original_filename, PATHINFO_EXTENSION) ?: 'jpg');

        if ($media->type !== FamilyMediaType::Image || ! $this->settings->optimizeImages()) {
            return $this->metaFromFile($absolute, $originalExt, $mime, false);
        }

        $optimizedPath = preg_replace('/\.[^.]+$/', '', $absolute).'.webp';
        $result = $this->optimizer->optimizeStandalone($absolute, $optimizedPath);
        $finalPath = (string) ($result['path'] ?? $absolute);
        $finalMime = (string) ($result['mime'] ?? $mime);
        $finalExt = Str::lower(pathinfo($finalPath, PATHINFO_EXTENSION) ?: '');
        if ($finalExt === '' || $finalExt === 'optimized') {
            $finalExt = str_contains($finalMime, 'webp') ? 'webp' : $originalExt;
        }

        return $this->metaFromFile($finalPath, $finalExt, $finalMime, ($result['engine'] ?? 'none') !== 'none');
    }

    /** @return array{absolute_path: string, extension: string, mime_type: string, size: int, width: ?int, height: ?int, optimized: bool} */
    private function metaFromFile(string $path, string $extension, string $mime, bool $optimized): array
    {
        $dims = @getimagesize($path);

        return [
            'absolute_path' => $path,
            'extension' => $extension !== '' ? $extension : 'jpg',
            'mime_type' => $mime,
            'size' => (int) (filesize($path) ?: 0),
            'width' => is_array($dims) ? (int) $dims[0] : null,
            'height' => is_array($dims) ? (int) $dims[1] : null,
            'optimized' => $optimized,
        ];
    }
}
