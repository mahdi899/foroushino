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

/** Image compression: Tinify + reSmush.it + local GD — smallest output wins. */
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
        $mime = $this->detectImageMime($sourcePath);
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
            $optimizedPath = isset($result['path']) && is_string($result['path']) && is_file($result['path'])
                ? $result['path']
                : $destPath;

            return $this->finalizeStandaloneOptimization($sourcePath, $optimizedPath, $result);
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

    /**
     * Family/site ingest: keep whichever variant is smaller before FTP upload.
     *
     * @param  array{engine?: string, converted_to_webp?: bool, size?: int, mime?: string, path?: string}  $result
     * @return array{engine: string, converted_to_webp: bool, size: int, mime: string, path: string, kept: 'original'|'optimized'}
     */
    private function finalizeStandaloneOptimization(string $originalPath, string $optimizedPath, array $result): array
    {
        $originalSize = filesize($originalPath) ?: 0;
        $optimizedSize = is_file($optimizedPath) ? (filesize($optimizedPath) ?: 0) : 0;

        if ($optimizedSize > 0 && ($originalSize === 0 || $optimizedSize < $originalSize)) {
            $mime = mime_content_type($optimizedPath) ?: ($result['mime'] ?? 'application/octet-stream');

            return [
                'engine' => (string) ($result['engine'] ?? 'optimized'),
                'converted_to_webp' => (bool) ($result['converted_to_webp'] ?? str_starts_with($mime, 'image/webp')),
                'size' => $optimizedSize,
                'mime' => $mime,
                'path' => $optimizedPath,
                'kept' => 'optimized',
            ];
        }

        if ($optimizedPath !== $originalPath && is_file($optimizedPath)) {
            @unlink($optimizedPath);
        }

        $mime = mime_content_type($originalPath) ?: ($result['mime'] ?? 'application/octet-stream');

        Log::info('Family image optimization kept original (smaller or equal)', [
            'original_size' => $originalSize,
            'optimized_size' => $optimizedSize,
            'engine' => $result['engine'] ?? null,
        ]);

        return [
            'engine' => $originalSize > 0 && $optimizedSize > 0 ? 'original' : (string) ($result['engine'] ?? 'copy'),
            'converted_to_webp' => str_starts_with($mime, 'image/webp'),
            'size' => $originalSize,
            'mime' => $mime,
            'path' => $originalPath,
            'kept' => 'original',
        ];
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
        $mime = $this->detectImageMime($originalPath);
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

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string, path?: string} */
    private function optimize(string $sourcePath, string $destPath, string $mime): array
    {
        $mime = $this->detectImageMime($sourcePath, $mime);
        $convertWebp = config('bahram.image_optimizer.convert_webp', true)
            && ! str_starts_with($mime, 'image/webp')
            && ! str_starts_with($mime, 'image/gif');
        $isWebpSource = str_starts_with($mime, 'image/webp');
        $originalSize = filesize($sourcePath) ?: 0;
        $dir = dirname($destPath);

        /** @var list<array{engine: string, converted_to_webp: bool, size: int, mime: string, path: string}> $candidates */
        $candidates = [];
        $tempFiles = [];

        if ($this->tinifyKey() && $this->tinifySupported($mime)) {
            $temp = $this->candidatePath($dir, 'tinify', $convertWebp ? 'webp' : $this->sourceExtension($sourcePath));
            try {
                $result = $this->optimizeWithTinify($sourcePath, $temp, $convertWebp);
                if (is_file($temp) && ($result['size'] ?? 0) > 0) {
                    $candidates[] = array_merge($result, ['path' => $temp]);
                    $tempFiles[] = $temp;
                }
            } catch (\Throwable $e) {
                @unlink($temp);
                Log::warning('Tinify optimization failed', ['error' => $e->getMessage()]);
            }
        }

        if ($this->optimizerSettings->resmushEnabled() && (ResmushClient::supportsPath($sourcePath) || $isWebpSource)) {
            $temp = $this->candidatePath($dir, 'resmush', $this->sourceExtension($sourcePath));
            try {
                $result = $this->optimizeWithResmush($sourcePath, $temp);
                $path = isset($result['path']) && is_string($result['path']) ? $result['path'] : $temp;
                if (is_file($path) && ($result['size'] ?? 0) > 0) {
                    $candidates[] = array_merge($result, ['path' => $path]);
                    $tempFiles[] = $path;
                    if ($path !== $temp) {
                        @unlink($temp);
                    }
                }
            } catch (\Throwable $e) {
                @unlink($temp);
                Log::warning('reSmush.it optimization failed', ['error' => $e->getMessage()]);
            }
        }

        if ($this->gdAvailable()) {
            $gdExt = $convertWebp && function_exists('imagewebp') ? 'webp' : $this->sourceExtension($sourcePath);
            $temp = $this->candidatePath($dir, 'gd', $gdExt);
            try {
                $result = $this->optimizeWithGd($sourcePath, $temp, $convertWebp);
                if (is_file($temp) && ($result['size'] ?? 0) > 0) {
                    $candidates[] = array_merge($result, ['path' => $temp]);
                    $tempFiles[] = $temp;
                }
            } catch (\Throwable $e) {
                @unlink($temp);
                Log::warning('GD optimization failed', ['error' => $e->getMessage(), 'path' => $sourcePath]);
            }
        }

        if ($candidates === []) {
            if (! copy($sourcePath, $destPath)) {
                throw new \RuntimeException('No image optimizer available (Tinify, reSmush.it, or PHP GD).');
            }

            return [
                'engine' => 'copy',
                'converted_to_webp' => str_starts_with($mime, 'image/webp'),
                'size' => $originalSize,
                'mime' => $mime,
                'path' => $destPath,
            ];
        }

        $winner = $this->pickSmallestCandidate($candidates);

        if ($originalSize > 0 && $winner['size'] >= $originalSize) {
            $originalDest = $this->destPathForSourceFormat($destPath, $sourcePath);
            copy($sourcePath, $originalDest);
            $this->cleanupTempFiles($tempFiles);

            return [
                'engine' => 'copy',
                'converted_to_webp' => str_starts_with($mime, 'image/webp'),
                'size' => $originalSize,
                'mime' => $mime,
                'path' => $originalDest,
            ];
        }

        $finalPath = $this->destPathForSourceFormat($destPath, $winner['path']);
        if ($winner['path'] !== $finalPath && ! copy($winner['path'], $finalPath)) {
            $this->cleanupTempFiles($tempFiles);
            throw new \RuntimeException('Could not save best optimized image.');
        }

        $this->cleanupTempFiles($tempFiles, $winner['path']);

        Log::debug('Image optimization picked best candidate', [
            'winner' => $winner['engine'],
            'winner_bytes' => $winner['size'],
            'original_bytes' => $originalSize,
            'candidates' => array_map(
                static fn (array $candidate): array => [
                    'engine' => $candidate['engine'],
                    'bytes' => $candidate['size'],
                ],
                $candidates,
            ),
        ]);

        return [
            'engine' => $winner['engine'],
            'converted_to_webp' => $winner['converted_to_webp'],
            'size' => filesize($finalPath) ?: $winner['size'],
            'mime' => mime_content_type($finalPath) ?: $winner['mime'],
            'path' => $finalPath,
        ];
    }

    /**
     * @param  list<array{engine: string, converted_to_webp: bool, size: int, mime: string, path: string}>  $candidates
     * @return array{engine: string, converted_to_webp: bool, size: int, mime: string, path: string}
     */
    private function pickSmallestCandidate(array $candidates): array
    {
        $winner = $candidates[0];

        foreach (array_slice($candidates, 1) as $candidate) {
            if ($candidate['size'] < $winner['size']) {
                $winner = $candidate;

                continue;
            }

            if ($candidate['size'] === $winner['size'] && $this->enginePriority($candidate['engine']) < $this->enginePriority($winner['engine'])) {
                $winner = $candidate;
            }
        }

        return $winner;
    }

    private function enginePriority(string $engine): int
    {
        return match ($engine) {
            'gd' => 0,
            'resmush' => 1,
            'tinify' => 2,
            default => 9,
        };
    }

    private function candidatePath(string $dir, string $engine, string $ext): string
    {
        $ext = $ext === 'jpeg' ? 'jpg' : $ext;

        return $dir.'/candidate-'.$engine.'-'.Str::lower(Str::ulid()->toString()).'.'.$ext;
    }

    private function sourceExtension(string $path): string
    {
        $ext = Str::lower(pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg');

        return $ext === 'jpeg' ? 'jpg' : $ext;
    }

    /** @param  list<string>  $paths */
    private function cleanupTempFiles(array $paths, ?string $except = null): void
    {
        foreach ($paths as $path) {
            if ($path !== $except && is_file($path)) {
                @unlink($path);
            }
        }
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string, path?: string} */
    private function optimizeWithResmush(string $sourcePath, string $destPath): array
    {
        $mime = $this->detectImageMime($sourcePath);
        $isWebpSource = str_starts_with($mime, 'image/webp');
        $bridgeTemp = null;
        $tinifyTemp = null;
        $inputPath = $sourcePath;

        if ($isWebpSource) {
            $bridgeTemp = $this->decodeWebpToPngTemp($sourcePath);
            $inputPath = $bridgeTemp;
        } elseif (! ResmushClient::supportsPath($sourcePath)) {
            throw new \RuntimeException('reSmush.it does not support this mime type.');
        }

        $tempPath = $this->optimizerSettings->resmushClient()->compressToTemp($inputPath);

        try {
            ['path' => $workingPath, 'temp' => $tinifyTemp] = $this->maybeTinifyCompress($tempPath);
            $outputPath = $this->destPathForSourceFormat($destPath, $workingPath);

            if (! copy($workingPath, $outputPath)) {
                throw new \RuntimeException('Could not save reSmush.it output.');
            }

            $outputMime = mime_content_type($outputPath) ?: 'application/octet-stream';

            return [
                'engine' => 'resmush',
                'converted_to_webp' => str_starts_with($outputMime, 'image/webp'),
                'size' => filesize($outputPath) ?: 0,
                'mime' => $outputMime,
                'path' => $outputPath,
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

    private function destPathForSourceFormat(string $destPath, string $sourceFilePath): string
    {
        $ext = Str::lower(pathinfo($sourceFilePath, PATHINFO_EXTENSION) ?: '');
        if ($ext === 'jpeg') {
            $ext = 'jpg';
        }
        if ($ext === '') {
            return $destPath;
        }

        $currentExt = Str::lower(pathinfo($destPath, PATHINFO_EXTENSION) ?: '');
        if ($currentExt === $ext) {
            return $destPath;
        }

        $replaced = preg_replace('/\.[^.]+$/', '.'.$ext, $destPath);

        return is_string($replaced) && $replaced !== '' ? $replaced : $destPath;
    }

    /** @return array{engine: string, converted_to_webp: bool, size: int, mime: string} */
    private function encodeWebp(string $sourcePath, string $destPath, ?int $quality = null): array
    {
        if (! function_exists('imagewebp') || ! $this->gdAvailable()) {
            throw new \RuntimeException('Could not encode WebP.');
        }

        $quality = max(0, min(100, $quality ?? $this->optimizerSettings->webpQuality()));
        $image = $this->loadGdImage($sourcePath);
        if (! $image) {
            throw new \RuntimeException('GD could not read compressed image.');
        }

        $image = $this->resizeGdIfNeeded($image);
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
        $quality = $this->optimizerSettings->webpQuality();

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
        $mime = $this->detectImageMime($path);
        $ext = Str::lower(pathinfo($path, PATHINFO_EXTENSION) ?: '');

        $attempts = [];

        if (str_contains($mime, 'jpeg') || in_array($ext, ['jpg', 'jpeg'], true)) {
            $attempts[] = static fn () => @imagecreatefromjpeg($path);
        }
        if (str_contains($mime, 'png') || $ext === 'png') {
            $attempts[] = static fn () => @imagecreatefrompng($path);
        }
        if ((str_contains($mime, 'webp') || $ext === 'webp') && function_exists('imagecreatefromwebp')) {
            $attempts[] = static fn () => @imagecreatefromwebp($path);
        }
        if (str_contains($mime, 'gif') || $ext === 'gif') {
            $attempts[] = static fn () => @imagecreatefromgif($path);
        }
        if ((str_contains($mime, 'bmp') || $ext === 'bmp') && function_exists('imagecreatefrombmp')) {
            $attempts[] = static fn () => @imagecreatefrombmp($path);
        }
        if ((str_contains($mime, 'avif') || $ext === 'avif') && function_exists('imagecreatefromavif')) {
            $attempts[] = static fn () => @imagecreatefromavif($path);
        }

        $attempts[] = function () use ($path) {
            $binary = @file_get_contents($path);
            if (! is_string($binary) || $binary === '') {
                return false;
            }

            return @imagecreatefromstring($binary);
        };

        foreach ($attempts as $attempt) {
            $image = $attempt();
            if ($image instanceof \GdImage) {
                return $image;
            }
        }

        return false;
    }

    private function detectImageMime(string $path, ?string $hint = null): string
    {
        $ext = Str::lower(pathinfo($path, PATHINFO_EXTENSION) ?: '');
        $fromExt = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'avif' => 'image/avif',
            'svg' => 'image/svg+xml',
            default => null,
        };

        $detected = Str::lower(trim((string) (mime_content_type($path) ?: $hint ?: '')));
        if ($detected === 'image/jpg') {
            $detected = 'image/jpeg';
        }

        if ($detected === '' || $detected === 'application/octet-stream' || ! str_starts_with($detected, 'image/')) {
            return $fromExt ?? ($hint ?: 'application/octet-stream');
        }

        return $detected;
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
                $this->encodeWebp($sourcePath, $destPath);

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
        $quality = $this->optimizerSettings->webpQuality();
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

        $hasAnyEngine = (bool) $this->tinifyKey()
            || $this->optimizerSettings->resmushEnabled()
            || $this->gdAvailable();

        if (! $hasAnyEngine) {
            return 'هیچ موتور فشرده‌سازی فعال نیست — از تنظیمات → بهینه‌سازی تصویر، reSmush.it را فعال کنید یا کلید TinyPNG را وارد کنید.';
        }

        return 'هیچ نسخه‌ای کوچک‌تر از فایل اصلی نبود — فایل اصلی نگه داشته شد.';
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
