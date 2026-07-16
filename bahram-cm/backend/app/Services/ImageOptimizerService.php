<?php

namespace App\Services;

use App\Models\Media;
use App\Support\ResmushClient;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Image compression: Tinify → reSmush.it → local GD (WebP). */
class ImageOptimizerService
{
    private const CACHE_PREFIX = 'media.optimize.';

    public function __construct(
        private readonly MediaService $mediaService,
        private readonly ImageOptimizerSettingsService $optimizerSettings,
    ) {
    }

    /** @return array<string, mixed> */
    public function createPreview(UploadedFile $file): array
    {
        $this->purgeExpiredSessions();

        $sessionId = (string) Str::uuid();
        $dir = $this->sessionDir($sessionId);
        File::ensureDirectoryExists($dir);

        $originalExt = Str::lower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $file->move($dir, 'original.'.$originalExt);

        return $this->finalizePreviewSession($sessionId, $dir.'/original.'.$originalExt, $file->getClientOriginalName());
    }

    /**
     * Optimize a file on disk (family uploads) without an admin preview session.
     *
     * @return array{engine: string, converted_to_webp: bool, size: int, mime: string, path: string}
     */
    public function optimizeStandalone(string $sourcePath, string $destPath): array
    {
        $mime = mime_content_type($sourcePath) ?: 'application/octet-stream';
        $originalExt = Str::lower(pathinfo($sourcePath, PATHINFO_EXTENSION) ?: 'bin');
        $skipReason = $this->skipReason($mime, $originalExt);

        if ($skipReason !== null) {
            if ($sourcePath !== $destPath) {
                copy($sourcePath, $destPath);
            }

            return [
                'engine' => 'none',
                'converted_to_webp' => false,
                'size' => (int) (filesize($destPath) ?: 0),
                'mime' => $mime,
                'path' => $destPath,
            ];
        }

        try {
            $result = $this->optimize($sourcePath, $destPath, $mime);
            if (isset($result['path']) && is_string($result['path']) && is_file($result['path'])) {
                $destPath = $result['path'];
            }

            return array_merge($result, ['path' => $destPath]);
        } catch (\Throwable $e) {
            Log::warning('Family image optimization failed, using original', [
                'error' => $e->getMessage(),
                'source' => $sourcePath,
            ]);

            if ($sourcePath !== $destPath) {
                copy($sourcePath, $destPath);
            }

            return [
                'engine' => 'copy',
                'converted_to_webp' => false,
                'size' => (int) (filesize($destPath) ?: 0),
                'mime' => $mime,
                'path' => $destPath,
            ];
        }
    }

    /** Preview optimization for an existing library item (in-place replace flow). */
    public function createPreviewFromMedia(Media $media): array
    {
        abort_if($media->is_private, 422, 'Private media cannot be optimized.');

        $mime = (string) ($media->mime ?? '');
        abort_unless(str_starts_with($mime, 'image/'), 422, 'Only images can be optimized.');
        abort_if(str_starts_with($mime, 'image/gif'), 422, 'GIF optimization is not supported.');

        $this->purgeExpiredSessions();

        $disk = Storage::disk($media->disk);
        abort_unless($disk->exists($media->path), 404, 'Media file missing.');

        $sessionId = (string) Str::uuid();
        $dir = $this->sessionDir($sessionId);
        File::ensureDirectoryExists($dir);

        $originalExt = Str::lower(pathinfo($media->path, PATHINFO_EXTENSION) ?: 'bin');
        $originalPath = $dir.'/original.'.$originalExt;
        File::put($originalPath, $disk->get($media->path));

        $filename = $media->original_filename ?: basename($media->path);

        return $this->finalizePreviewSession($sessionId, $originalPath, $filename);
    }

    /**
     * @return array<string, mixed>
     */
    private function finalizePreviewSession(string $sessionId, string $originalPath, string $originalFilename): array
    {
        [$width, $height] = $this->dimensions($originalPath);
        $originalSize = filesize($originalPath) ?: 0;
        $mime = mime_content_type($originalPath) ?: 'application/octet-stream';
        $originalExt = Str::lower(pathinfo($originalPath, PATHINFO_EXTENSION) ?: 'bin');

        $skipReason = $this->skipReason($mime, $originalExt);
        $convertWebp = config('bahram.image_optimizer.convert_webp', true)
            && ! str_starts_with($mime, 'image/webp')
            && ! str_starts_with($mime, 'image/gif');
        $optimizedExt = $convertWebp ? 'webp' : $originalExt;
        $optimizedPath = dirname($originalPath).'/optimized.'.$optimizedExt;
        $engine = 'none';
        $convertedToWebp = false;
        $optimizedSize = $originalSize;
        $optimizedMime = $mime;
        $optimizationError = null;

        if ($skipReason === null) {
            try {
                $result = $this->optimize($originalPath, $optimizedPath, $mime);
                $engine = $result['engine'];
                $convertedToWebp = $result['converted_to_webp'];
                $optimizedSize = $result['size'];
                $optimizedMime = $result['mime'];
                if (isset($result['path']) && is_string($result['path']) && is_file($result['path'])) {
                    $optimizedPath = $result['path'];
                }
                [$width, $height] = $this->dimensions($optimizedPath) ?: [$width, $height];
            } catch (\Throwable $e) {
                Log::warning('Image optimization failed, using original copy', [
                    'session' => $sessionId,
                    'error' => $e->getMessage(),
                ]);
                copy($originalPath, $optimizedPath = dirname($originalPath).'/optimized.'.$originalExt);
                $optimizedSize = filesize($optimizedPath) ?: $originalSize;
                $optimizedMime = $mime;
                $engine = 'copy';
                $optimizationError = $e->getMessage();
            }
        } else {
            copy($originalPath, $optimizedPath = dirname($originalPath).'/optimized.'.$originalExt);
            $optimizedSize = $originalSize;
            $optimizedMime = $mime;
        }

        $savingsPercent = $originalSize > 0
            ? (int) round((1 - ($optimizedSize / $originalSize)) * 100)
            : 0;

        $payload = [
            'session_id' => $sessionId,
            'original_filename' => $originalFilename,
            'original_mime' => $mime,
            'original_size' => $originalSize,
            'optimized_mime' => $optimizedMime,
            'optimized_size' => $optimizedSize,
            'width' => $width,
            'height' => $height,
            'engine' => $engine,
            'converted_to_webp' => $convertedToWebp,
            'savings_percent' => $savingsPercent,
            'skip_reason' => $skipReason,
            'optimization_error' => $optimizationError,
            'original_path' => $originalPath,
            'optimized_path' => $optimizedPath,
            'created_at' => now()->toIso8601String(),
        ];

        Cache::put(self::CACHE_PREFIX.$sessionId, $payload, now()->addMinutes($this->ttlMinutes()));

        return $this->publicPreviewPayload($payload);
    }

    public function confirmReplace(string $sessionId, Media $media, string $variant, ?string $alt): Media
    {
        $payload = $this->session($sessionId);
        abort_unless($payload, 404, 'Preview session expired.');

        $path = $variant === 'original'
            ? $payload['original_path']
            : $payload['optimized_path'];

        abort_unless(is_string($path) && is_file($path), 404, 'Preview file missing.');

        $mime = $variant === 'original'
            ? ($payload['original_mime'] ?? 'application/octet-stream')
            : ($payload['optimized_mime'] ?? 'image/webp');

        $targetExt = Str::lower(pathinfo($media->path, PATHINFO_EXTENSION) ?: 'bin');
        $path = $this->exportToExtension($path, $targetExt);
        $mime = mime_content_type($path) ?: $mime;

        $updated = $this->mediaService->replaceFileInPlace($media, $path, $mime, $alt);
        $this->discard($sessionId);

        return $updated;
    }

    public function confirm(string $sessionId, string $variant, ?string $alt, ?int $userId, ?string $category): Media
    {
        $payload = $this->session($sessionId);
        abort_unless($payload, 404, 'Preview session expired.');

        $path = $variant === 'original'
            ? $payload['original_path']
            : $payload['optimized_path'];

        abort_unless(is_string($path) && is_file($path), 404, 'Preview file missing.');

        $mime = $variant === 'original'
            ? ($payload['original_mime'] ?? 'application/octet-stream')
            : ($payload['optimized_mime'] ?? 'image/webp');

        $media = $this->mediaService->storeFromLocalFile(
            $path,
            $mime,
            $alt,
            $userId,
            $category,
            $payload['original_filename'] ?? null,
        );

        $this->discard($sessionId);

        return $media;
    }

    public function discard(string $sessionId): void
    {
        $payload = $this->session($sessionId);
        if ($payload) {
            $dir = $this->sessionDir($sessionId);
            if (is_dir($dir)) {
                File::deleteDirectory($dir);
            }
        }
        Cache::forget(self::CACHE_PREFIX.$sessionId);
    }

    /** @return array<string, mixed>|null */
    public function session(string $sessionId): ?array
    {
        $data = Cache::get(self::CACHE_PREFIX.$sessionId);

        return is_array($data) ? $data : null;
    }

    public function previewFilePath(string $sessionId, string $variant): ?string
    {
        $payload = $this->session($sessionId);
        if (! $payload) {
            return null;
        }

        $key = $variant === 'original' ? 'original_path' : 'optimized_path';

        return isset($payload[$key]) && is_file($payload[$key]) ? $payload[$key] : null;
    }

    /** @return array<string, mixed> */
    private function publicPreviewPayload(array $payload): array
    {
        $sessionId = $payload['session_id'];
        $ttl = now()->addMinutes($this->ttlMinutes());

        return [
            'session_id' => $sessionId,
            'original_filename' => $payload['original_filename'],
            'original' => $this->variantMeta($payload, 'original', $ttl),
            'optimized' => $this->variantMeta($payload, 'optimized', $ttl),
            'savings_percent' => $payload['savings_percent'],
            'engine' => $payload['engine'],
            'engine_note' => $this->engineNote($payload),
            'converted_to_webp' => $payload['converted_to_webp'],
            'skip_reason' => $payload['skip_reason'],
            'recommended' => ($payload['savings_percent'] ?? 0) > 0 ? 'optimized' : 'original',
        ];
    }

    /** @return array<string, mixed> */
    private function variantMeta(array $payload, string $variant, \DateTimeInterface $ttl): array
    {
        $prefix = $variant === 'original' ? 'original' : 'optimized';

        $frontend = rtrim((string) config('bahram.frontend_url', config('app.frontend_url', 'http://localhost:3000')), '/');
        $previousRoot = config('app.url');
        \Illuminate\Support\Facades\URL::forceRootUrl($frontend);

        try {
            $previewUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
                'media.optimize.preview',
                $ttl,
                ['session' => $payload['session_id'], 'variant' => $variant],
            );
        } finally {
            \Illuminate\Support\Facades\URL::forceRootUrl($previousRoot);
        }

        return [
            'preview_url' => $previewUrl,
            'mime' => $payload[$prefix.'_mime'],
            'size' => $payload[$prefix.'_size'],
            'width' => $payload['width'],
            'height' => $payload['height'],
        ];
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string} */
    private function optimize(string $sourcePath, string $destPath, string $mime): array
    {
        $convertWebp = config('bahram.image_optimizer.convert_webp', true)
            && ! str_starts_with($mime, 'image/webp')
            && ! str_starts_with($mime, 'image/gif');
        $isWebpSource = str_starts_with($mime, 'image/webp');

        if ($this->tinifyKey() && $this->tinifySupported($mime)) {
            try {
                return $this->optimizeWithTinify($sourcePath, $destPath, $convertWebp);
            } catch (\Throwable $e) {
                Log::warning('Tinify optimization failed, trying fallback', ['error' => $e->getMessage()]);
            }
        }

        if ($this->optimizerSettings->resmushEnabled() && (ResmushClient::supportsMime($mime) || $isWebpSource)) {
            try {
                return $this->optimizeWithResmush($sourcePath, $destPath, $convertWebp);
            } catch (\Throwable $e) {
                Log::warning('reSmush.it optimization failed, trying fallback', ['error' => $e->getMessage()]);
            }
        }

        if ($this->gdAvailable()) {
            return $this->guardSmallerThanOriginal(
                $sourcePath,
                $destPath,
                $this->optimizeWithGd($sourcePath, $destPath, $convertWebp),
            );
        }

        throw new \RuntimeException('No image optimizer available (Tinify, reSmush.it, or PHP GD).');
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string} */
    private function optimizeWithResmush(string $sourcePath, string $destPath, bool $convertWebp): array
    {
        $mime = mime_content_type($sourcePath) ?: '';
        $isWebpSource = str_starts_with($mime, 'image/webp');
        $bridgeTemp = null;
        $tinifyTemp = null;
        $inputPath = $sourcePath;

        if ($isWebpSource) {
            $bridgeTemp = $this->decodeWebpToPngTemp($sourcePath);
            $inputPath = $bridgeTemp;
        } elseif (! ResmushClient::supportsMime($mime)) {
            throw new \RuntimeException('reSmush.it does not support this mime type.');
        }

        $tempPath = $this->optimizerSettings->resmushClient()->compressToTemp($inputPath);

        try {
            ['path' => $workingPath, 'temp' => $tinifyTemp] = $this->maybeTinifyCompress($tempPath);
            $needsWebp = $convertWebp || ($isWebpSource && str_ends_with(strtolower($destPath), '.webp'));

            if ($needsWebp) {
                try {
                    return $this->finalizeOptimizedWebp($workingPath, $destPath);
                } catch (\Throwable $e) {
                    Log::warning('WebP encode after reSmush failed, using compressed source file', [
                        'error' => $e->getMessage(),
                    ]);

                    return $this->saveResmushOutputAsFallback($workingPath, $destPath);
                }
            }

            if (! copy($workingPath, $destPath)) {
                throw new \RuntimeException('Could not save reSmush.it output.');
            }

            return [
                'engine' => 'resmush',
                'converted_to_webp' => false,
                'size' => filesize($destPath) ?: 0,
                'mime' => mime_content_type($destPath) ?: 'application/octet-stream',
            ];
        } finally {
            foreach ([$tempPath, $bridgeTemp, $tinifyTemp] as $file) {
                if ($file !== null && is_file($file)) {
                    @unlink($file);
                }
            }
        }
    }

    /** @return array{path: string, temp: ?string} */
    private function maybeTinifyCompress(string $sourcePath): array
    {
        if (! $this->tinifyKey()) {
            return ['path' => $sourcePath, 'temp' => null];
        }

        try {
            $ext = Str::lower(pathinfo($sourcePath, PATHINFO_EXTENSION) ?: 'jpg');
            $tempPath = dirname($sourcePath).'/tinify-'.Str::lower(Str::ulid()->toString()).'.'.$ext;
            \Tinify\setKey($this->tinifyKey());
            \Tinify\fromFile($sourcePath)->toFile($tempPath);

            if (is_file($tempPath) && (filesize($tempPath) ?: 0) < (filesize($sourcePath) ?: PHP_INT_MAX)) {
                return ['path' => $tempPath, 'temp' => $tempPath];
            }

            @unlink($tempPath);
        } catch (\Throwable $e) {
            Log::warning('Tinify post-compress failed, using reSmush output', ['error' => $e->getMessage()]);
        }

        return ['path' => $sourcePath, 'temp' => null];
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string} */
    private function finalizeOptimizedWebp(string $sourcePath, string $destPath): array
    {
        if ($this->tinifyKey()) {
            try {
                \Tinify\setKey($this->tinifyKey());
                \Tinify\fromFile($sourcePath)->convert(['type' => ['image/webp']])->toFile($destPath);

                return [
                    'engine' => 'tinify',
                    'converted_to_webp' => true,
                    'size' => filesize($destPath) ?: 0,
                    'mime' => 'image/webp',
                ];
            } catch (\Throwable $e) {
                Log::warning('Tinify WebP export failed, using reSmush WebP encode', ['error' => $e->getMessage()]);
            }
        }

        return $this->encodeWebpSmallest($sourcePath, $destPath);
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string} */
    private function encodeWebpSmallest(string $sourcePath, string $destPath): array
    {
        if (! function_exists('imagewebp') || ! $this->gdAvailable()) {
            throw new \RuntimeException('Could not encode WebP.');
        }

        $baseQuality = (int) config('bahram.image_optimizer.webp_quality', 85);
        $qualities = array_values(array_unique([$baseQuality, 80, 70, 60, 50, 40, 30, 20]));
        $bestSize = null;
        $bestQuality = $baseQuality;

        foreach ($qualities as $quality) {
            $image = $this->loadGdImage($sourcePath);
            if (! $image) {
                throw new \RuntimeException('GD could not read compressed image.');
            }

            $image = $this->resizeGdIfNeeded($image);
            $image = $this->toTruecolorImage($image);
            imagewebp($image, $destPath, $quality);
            imagedestroy($image);

            $size = filesize($destPath) ?: 0;
            if ($size > 0 && ($bestSize === null || $size < $bestSize)) {
                $bestSize = $size;
                $bestQuality = $quality;
            }
        }

        $image = $this->loadGdImage($sourcePath);
        if (! $image) {
            throw new \RuntimeException('GD could not read compressed image.');
        }

        $image = $this->resizeGdIfNeeded($image);
        $image = $this->toTruecolorImage($image);
        imagewebp($image, $destPath, $bestQuality);
        imagedestroy($image);

        return [
            'engine' => 'resmush',
            'converted_to_webp' => true,
            'size' => filesize($destPath) ?: 0,
            'mime' => 'image/webp',
        ];
    }

    /**
     * reSmush.it does not accept WebP — decode to PNG for the API.
     */
    private function decodeWebpToPngTemp(string $webpPath): string
    {
        if (! function_exists('imagecreatefromwebp')) {
            throw new \RuntimeException('GD WebP decode unavailable.');
        }

        $image = @imagecreatefromwebp($webpPath);
        if (! $image) {
            throw new \RuntimeException('Could not decode WebP for reSmush.it.');
        }

        $image = $this->resizeGdIfNeeded($image);
        $tempPath = dirname($webpPath).'/resmush-bridge-'.Str::lower(Str::ulid()->toString()).'.png';
        imagepng($image, $tempPath, 6);
        imagedestroy($image);

        if (! is_file($tempPath)) {
            throw new \RuntimeException('Could not write PNG bridge file.');
        }

        return $tempPath;
    }

    /**
     * @param  array{engine: string, converted_to_webp: bool, size: int, mime: string}  $result
     * @return array{engine: string, converted_to_webp: bool, size: int, mime: string}
     */
    private function guardSmallerThanOriginal(string $originalPath, string $destPath, array $result): array
    {
        $originalSize = filesize($originalPath) ?: 0;
        $optimizedSize = filesize($destPath) ?: 0;

        if ($originalSize === 0 || $optimizedSize < $originalSize) {
            return $result;
        }

        $originalExt = Str::lower(pathinfo($originalPath, PATHINFO_EXTENSION) ?: '');
        $destExt = Str::lower(pathinfo($destPath, PATHINFO_EXTENSION) ?: '');
        if (! $this->extensionsMatch($originalExt, $destExt)) {
            return $result;
        }

        copy($originalPath, $destPath);
        $mime = mime_content_type($originalPath) ?: 'application/octet-stream';

        return [
            'engine' => 'copy',
            'converted_to_webp' => str_starts_with($mime, 'image/webp'),
            'size' => $originalSize,
            'mime' => $mime,
        ];
    }

    private function extensionsMatch(string $a, string $b): bool
    {
        $a = $a === 'jpeg' ? 'jpg' : $a;
        $b = $b === 'jpeg' ? 'jpg' : $b;

        return $a === $b;
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string} */
    private function optimizeWithTinify(string $sourcePath, string $destPath, bool $convertWebp): array
    {
        \Tinify\setKey($this->tinifyKey());
        $source = \Tinify\fromFile($sourcePath);

        if ($convertWebp) {
            $converted = $source->convert(['type' => ['image/webp']]);
            $converted->toFile($destPath);

            return [
                'engine' => 'tinify',
                'converted_to_webp' => true,
                'size' => filesize($destPath) ?: 0,
                'mime' => 'image/webp',
            ];
        }

        $source->toFile($destPath);

        return [
            'engine' => 'tinify',
            'converted_to_webp' => false,
            'size' => filesize($destPath) ?: 0,
            'mime' => mime_content_type($destPath) ?: 'application/octet-stream',
        ];
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string} */
    private function optimizeWithGd(string $sourcePath, string $destPath, bool $convertWebp): array
    {
        $image = $this->loadGdImage($sourcePath);
        if (! $image) {
            throw new \RuntimeException('GD could not read image.');
        }

        $image = $this->resizeGdIfNeeded($image);
        $quality = (int) config('bahram.image_optimizer.webp_quality', 85);

        if ($convertWebp && function_exists('imagewebp')) {
            $image = $this->toTruecolorImage($image);
            imagewebp($image, $destPath, $quality);
            imagedestroy($image);

            return [
                'engine' => 'gd',
                'converted_to_webp' => true,
                'size' => filesize($destPath) ?: 0,
                'mime' => 'image/webp',
            ];
        }

        $ext = Str::lower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        $this->saveGdImage($image, $destPath, $ext, $quality);
        imagedestroy($image);

        return [
            'engine' => 'gd',
            'converted_to_webp' => false,
            'size' => filesize($destPath) ?: 0,
            'mime' => mime_content_type($destPath) ?: 'application/octet-stream',
        ];
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string, path?: string} */
    private function saveResmushOutputAsFallback(string $workingPath, string $destPath): array
    {
        $ext = Str::lower(pathinfo($workingPath, PATHINFO_EXTENSION) ?: 'jpg');
        $fallbackPath = preg_replace('/\.[^.]+$/', '.'.$ext, $destPath);
        if ($fallbackPath === $destPath) {
            $fallbackPath = dirname($destPath).'/optimized.'.$ext;
        }

        if (! copy($workingPath, $fallbackPath)) {
            throw new \RuntimeException('Could not save reSmush.it output.');
        }

        return [
            'engine' => 'resmush',
            'converted_to_webp' => false,
            'size' => filesize($fallbackPath) ?: 0,
            'mime' => mime_content_type($fallbackPath) ?: 'application/octet-stream',
            'path' => $fallbackPath,
        ];
    }

    private function toTruecolorImage(\GdImage $image): \GdImage
    {
        if (imageistruecolor($image)) {
            return $image;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $truecolor = imagecreatetruecolor($width, $height);
        imagealphablending($truecolor, false);
        imagesavealpha($truecolor, true);

        $transparentIndex = imagecolortransparent($image);
        if ($transparentIndex >= 0) {
            $transparentColor = imagecolorsforindex($image, $transparentIndex);
            $alphaColor = imagecolorallocatealpha(
                $truecolor,
                $transparentColor['red'],
                $transparentColor['green'],
                $transparentColor['blue'],
                127,
            );
            imagefill($truecolor, 0, 0, $alphaColor);
            imagealphablending($truecolor, true);
        }

        imagecopy($truecolor, $image, 0, 0, 0, 0, $width, $height);
        imagedestroy($image);

        return $truecolor;
    }

    private function loadGdImage(string $path): \GdImage|false
    {
        $mime = mime_content_type($path) ?: '';

        return match (true) {
            str_contains($mime, 'jpeg') => @imagecreatefromjpeg($path),
            str_contains($mime, 'png') => @imagecreatefrompng($path),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            str_contains($mime, 'gif') => @imagecreatefromgif($path),
            default => false,
        };
    }

    private function resizeGdIfNeeded(\GdImage $image): \GdImage
    {
        $max = (int) config('bahram.image_optimizer.max_dimension', 2560);
        $width = imagesx($image);
        $height = imagesy($image);

        if ($width <= $max && $height <= $max) {
            return $image;
        }

        $ratio = min($max / $width, $max / $height);
        $newW = (int) round($width * $ratio);
        $newH = (int) round($height * $ratio);
        $resized = imagecreatetruecolor($newW, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $width, $height);
        imagedestroy($image);

        return $resized;
    }

    private function saveGdImage(\GdImage $image, string $destPath, string $ext, int $quality): void
    {
        match ($ext) {
            'png' => imagepng($image, $destPath, (int) round(9 - ($quality / 11))),
            'gif' => imagegif($image, $destPath),
            'webp' => imagewebp($image, $destPath, $quality),
            default => imagejpeg($image, $destPath, $quality),
        };
    }

    /** Re-encode preview file to match the storage extension (keeps the same public URL). */
    private function exportToExtension(string $sourcePath, string $targetExt): string
    {
        $targetExt = Str::lower($targetExt === 'jpeg' ? 'jpg' : $targetExt);
        $sourceExt = Str::lower(pathinfo($sourcePath, PATHINFO_EXTENSION) ?: '');
        if ($sourceExt === $targetExt || ($sourceExt === 'jpeg' && $targetExt === 'jpg')) {
            return $sourcePath;
        }

        $destPath = dirname($sourcePath).'/export.'.$targetExt;

        if ($targetExt === 'webp') {
            if ($this->tinifyKey()) {
                try {
                    \Tinify\setKey($this->tinifyKey());
                    $converted = \Tinify\fromFile($sourcePath)->convert(['type' => ['image/webp']]);
                    $converted->toFile($destPath);
                    if (is_file($destPath)) {
                        return $destPath;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Tinify export to WebP failed, trying GD', ['error' => $e->getMessage()]);
                }
            }

            try {
                $this->encodeWebpSmallest($sourcePath, $destPath);

                return is_file($destPath) ? $destPath : $sourcePath;
            } catch (\Throwable) {
                return $sourcePath;
            }
        }

        $image = $this->loadGdImage($sourcePath);
        if (! $image) {
            return $sourcePath;
        }

        $image = $this->resizeGdIfNeeded($image);
        $quality = (int) config('bahram.image_optimizer.webp_quality', 85);
        $this->saveGdImage($image, $destPath, $targetExt, $quality);
        imagedestroy($image);

        return is_file($destPath) ? $destPath : $sourcePath;
    }

    private function tinifySupported(string $mime): bool
    {
        return in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true);
    }

    private function skipReason(string $mime, string $ext): ?string
    {
        if ($mime === 'image/gif' || $ext === 'gif') {
            return 'gif';
        }
        if ($mime === 'image/svg+xml' || $ext === 'svg') {
            return 'svg';
        }

        return null;
    }

    private function tinifyKey(): ?string
    {
        return $this->optimizerSettings->tinifyKey();
    }

    /** @param  array<string, mixed>  $payload */
    private function engineNote(array $payload): ?string
    {
        if (($payload['engine'] ?? '') !== 'copy') {
            return null;
        }

        if (! empty($payload['optimization_error']) && is_string($payload['optimization_error'])) {
            return 'خطا در بهینه‌سازی: '.$payload['optimization_error'];
        }

        $hasTinify = (bool) $this->tinifyKey();
        $hasResmush = $this->optimizerSettings->resmushEnabled();

        if (! $hasTinify && ! $hasResmush) {
            if ($this->gdAvailable()) {
                return 'موتور داخلی PHP GD — TinyPNG و reSmush غیرفعال یا در دسترس نیستند.';
            }

            return 'هیچ موتور فشرده‌سازی فعال نیست — از تنظیمات → بهینه‌سازی تصویر، reSmush.it را فعال کنید یا کلید TinyPNG را وارد کنید.';
        }

        if ($this->gdAvailable()) {
            return 'سرویس‌های خارجی در دسترس نبودند — از موتور داخلی GD استفاده شد.';
        }

        return 'بهینه‌سازی با TinyPNG/reSmush.it ناموفق بود — اتصال را از تنظیمات تست کنید.';
    }

    private function gdAvailable(): bool
    {
        return extension_loaded('gd') && function_exists('imagecreatetruecolor');
    }

    /** @return array{0: ?int, 1: ?int} */
    private function dimensions(string $path): array
    {
        $size = @getimagesize($path);
        if ($size) {
            return [$size[0], $size[1]];
        }

        return [null, null];
    }

    private function sessionDir(string $sessionId): string
    {
        return storage_path('app/temp/media-optimize/'.$sessionId);
    }

    private function ttlMinutes(): int
    {
        return (int) config('bahram.image_optimizer.session_ttl_minutes', 30);
    }

    private function purgeExpiredSessions(): void
    {
        $root = storage_path('app/temp/media-optimize');
        if (! is_dir($root)) {
            return;
        }

        $cutoff = now()->subMinutes($this->ttlMinutes() + 5)->getTimestamp();
        foreach (File::directories($root) as $dir) {
            if (@filemtime($dir) !== false && filemtime($dir) < $cutoff) {
                File::deleteDirectory($dir);
            }
        }
    }
}
