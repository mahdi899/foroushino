<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Thin ffmpeg/ffprobe wrappers — gracefully no-op when binaries are missing
 * so local/dev environments without media tooling still mark media READY.
 */
final class FamilyFfmpeg
{
    public static function ffmpegBin(): string
    {
        return (string) config('family.media.ffmpeg_bin', env('FAMILY_FFMPEG_BIN', 'ffmpeg'));
    }

    public static function ffprobeBin(): string
    {
        return (string) config('family.media.ffprobe_bin', env('FAMILY_FFPROBE_BIN', 'ffprobe'));
    }

    public static function available(): bool
    {
        $process = new Process([self::ffmpegBin(), '-version']);
        $process->setTimeout(5);
        $process->run();

        return $process->isSuccessful();
    }

    /**
     * @return array{duration: ?int, width: ?int, height: ?int}
     */
    public static function probe(string $absolutePath): array
    {
        $process = new Process([
            self::ffprobeBin(),
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            $absolutePath,
        ]);
        $process->setTimeout(30);
        $process->run();

        if (! $process->isSuccessful()) {
            Log::warning('family.ffprobe_failed', ['path' => $absolutePath, 'error' => $process->getErrorOutput()]);

            return ['duration' => null, 'width' => null, 'height' => null];
        }

        $json = json_decode($process->getOutput(), true) ?: [];
        $duration = isset($json['format']['duration']) ? (int) round((float) $json['format']['duration']) : null;
        $width = null;
        $height = null;
        foreach ($json['streams'] ?? [] as $stream) {
            if (($stream['codec_type'] ?? '') === 'video') {
                $width = isset($stream['width']) ? (int) $stream['width'] : null;
                $height = isset($stream['height']) ? (int) $stream['height'] : null;
                break;
            }
        }

        return compact('duration', 'width', 'height');
    }

    public static function extractThumbnail(string $videoPath, string $thumbPath, float $atSeconds = 0.5): bool
    {
        $process = new Process([
            self::ffmpegBin(),
            '-y',
            '-ss', (string) $atSeconds,
            '-i', $videoPath,
            '-frames:v', '1',
            '-q:v', '3',
            $thumbPath,
        ]);
        $process->setTimeout(60);
        $process->run();

        if (! $process->isSuccessful()) {
            Log::warning('family.ffmpeg_thumb_failed', [
                'video' => $videoPath,
                'error' => $process->getErrorOutput(),
            ]);

            return false;
        }

        return is_file($thumbPath);
    }

    /**
     * Peak-normalized waveform (0..1) with `$points` samples from an audio file.
     *
     * @return list<float>|null
     */
    public static function waveform(string $audioPath, int $points = 64): ?array
    {
        $rawPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-wf-'.uniqid('', true).'.raw';

        try {
            $process = new Process([
                self::ffmpegBin(),
                '-y',
                '-i', $audioPath,
                '-ac', '1',
                '-filter:a', 'aresample=8000',
                '-map', '0:a:0',
                '-c:a', 'pcm_s16le',
                '-f', 's16le',
                $rawPath,
            ]);
            $process->setTimeout(90);
            $process->run();

            if (! $process->isSuccessful() || ! is_file($rawPath)) {
                return null;
            }

            $bytes = file_get_contents($rawPath);
            if ($bytes === false || $bytes === '') {
                return null;
            }

            $sampleCount = intdiv(strlen($bytes), 2);
            if ($sampleCount < 1) {
                return null;
            }

            $bucket = max(1, intdiv($sampleCount, $points));
            $out = [];
            $max = 1.0;

            for ($i = 0; $i < $points; $i++) {
                $start = $i * $bucket;
                $end = min($sampleCount, $start + $bucket);
                $peak = 0.0;
                for ($s = $start; $s < $end; $s++) {
                    $pair = unpack('s', substr($bytes, $s * 2, 2));
                    if ($pair === false) {
                        continue;
                    }
                    $peak = max($peak, abs($pair[1] / 32768.0));
                }
                $out[] = $peak;
                $max = max($max, $peak);
            }

            return array_map(fn (float $v) => round(min(1, $v / $max), 3), $out);
        } finally {
            if (is_file($rawPath)) {
                @unlink($rawPath);
            }
        }
    }
}
