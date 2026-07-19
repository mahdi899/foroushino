<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/** Free image compression API — https://resmush.it/api/ */
final class ResmushClient
{
    private const API_URL = 'https://api.resmush.it/ws.php';

    public function __construct(
        private readonly int $quality,
        private readonly string $userAgent,
        private readonly string $referer,
    ) {
    }

    public static function fromConfig(): self
    {
        return new self(
            quality: (int) config('bahram.image_optimizer.resmush_quality', 85),
            userAgent: (string) config('bahram.image_optimizer.resmush_user_agent', 'BahramRostami/1.0'),
            referer: (string) config('bahram.image_optimizer.resmush_referer', config('bahram.frontend_url', 'http://localhost:3000')),
        );
    }

    public static function enabled(): bool
    {
        return filter_var(config('bahram.image_optimizer.resmush_enabled', true), FILTER_VALIDATE_BOOL);
    }

    public static function supportsMime(string $mime): bool
    {
        $mime = $mime === 'image/jpg' ? 'image/jpeg' : $mime;

        return in_array($mime, ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'], true);
    }

    public static function supportsPath(string $path): bool
    {
        $mime = mime_content_type($path) ?: '';
        if (self::supportsMime($mime)) {
            return true;
        }

        $ext = Str::lower(pathinfo($path, PATHINFO_EXTENSION) ?: '');

        return in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'bmp'], true);
    }

    private static function uploadMimeFor(string $path): string
    {
        $mime = mime_content_type($path) ?: '';
        if ($mime === 'image/jpg') {
            $mime = 'image/jpeg';
        }
        if ($mime !== '' && $mime !== 'application/octet-stream' && str_starts_with($mime, 'image/')) {
            return $mime;
        }

        return match (Str::lower(pathinfo($path, PATHINFO_EXTENSION) ?: '')) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            default => 'application/octet-stream',
        };
    }

    /** Compress a local file; returns path to downloaded optimized temp file. */
    public function compressToTemp(string $sourcePath): string
    {
        $name = basename($sourcePath);
        $mime = self::uploadMimeFor($sourcePath);
        $url = self::API_URL.'?qlty='.max(0, min(100, $this->quality));

        $response = Http::withHeaders([
            'User-Agent' => $this->userAgent,
            'Referer' => $this->referer,
        ])
            ->timeout(60)
            ->attach('files', file_get_contents($sourcePath) ?: '', $name, ['Content-Type' => $mime])
            ->post($url);

        if (! $response->successful()) {
            throw new \RuntimeException('reSmush.it HTTP '.$response->status());
        }

        /** @var array<string, mixed>|null $json */
        $json = $response->json();
        if (! is_array($json)) {
            throw new \RuntimeException('reSmush.it returned invalid JSON.');
        }

        if (! empty($json['error'])) {
            $msg = is_string($json['error_long'] ?? null) ? $json['error_long'] : (string) $json['error'];
            throw new \RuntimeException('reSmush.it: '.$msg);
        }

        $destUrl = $json['dest'] ?? null;
        if (! is_string($destUrl) || $destUrl === '') {
            throw new \RuntimeException('reSmush.it: missing dest URL.');
        }

        $ext = Str::lower(pathinfo(parse_url($destUrl, PHP_URL_PATH) ?: '', PATHINFO_EXTENSION) ?: pathinfo($sourcePath, PATHINFO_EXTENSION) ?: 'jpg');
        $tempPath = dirname($sourcePath).'/resmush-'.Str::lower(Str::ulid()->toString()).'.'.$ext;

        $download = Http::timeout(60)->sink($tempPath)->get($destUrl);
        if (! $download->successful() || ! is_file($tempPath)) {
            @unlink($tempPath);
            throw new \RuntimeException('reSmush.it: failed to download optimized file.');
        }

        $srcSize = filesize($sourcePath) ?: 0;
        $outSize = filesize($tempPath) ?: 0;
        if ($outSize === 0) {
            @unlink($tempPath);
            throw new \RuntimeException('reSmush.it: empty output file.');
        }

        Log::debug('reSmush.it compressed image', [
            'src_bytes' => $srcSize,
            'out_bytes' => $outSize,
            'percent' => $json['percent'] ?? null,
        ]);

        return $tempPath;
    }
}
