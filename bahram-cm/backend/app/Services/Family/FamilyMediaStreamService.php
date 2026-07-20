<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyMedia;
use App\Models\FamilyPostBlock;
use App\Models\FamilyStory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class FamilyMediaStreamService
{
    private const CHUNK_BYTES = 8192;

    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly PostAudienceResolver $audience,
    ) {}

    public function assertStreamable(User $user, FamilyMedia $media): void
    {
        abort_unless($media->status === FamilyMediaStatus::Ready, 404);
        abort_unless(filled($media->storage_path), 404);

        $membership = $this->access->requireMembership($user);
        $familyId = (int) $membership->family_id;

        $inPublishedPost = FamilyPostBlock::query()
            ->where('media_id', $media->id)
            ->whereHas('post', function ($query) use ($familyId) {
                $query->where('status', FamilyPostStatus::Published)
                    ->whereNotNull('published_at');
                $this->audience->scopeVisibleToFamily($query, $familyId);
            })
            ->exists();

        $inActiveStory = FamilyStory::query()
            ->where('media_id', $media->id)
            ->where('expires_at', '>', now())
            ->exists();

        abort_unless($inPublishedPost || $inActiveStory, 404);
    }

    public function response(Request $request, FamilyMedia $media): BinaryFileResponse|StreamedResponse
    {
        $diskName = $media->disk ?: config('family.media.disk', 'public');
        $disk = Storage::disk($diskName);
        $path = (string) $media->storage_path;

        abort_unless($disk->exists($path), 404);

        $mime = $this->resolveMimeType($media);
        $downloadName = $media->original_filename ?: basename($path);

        $localPath = $this->localAbsolutePath($diskName, $path);
        if ($localPath !== null) {
            return $this->localFileResponse($request, $localPath, $mime, $downloadName);
        }

        return $this->remoteRangedStreamResponse($request, $disk, $path, $mime, $downloadName);
    }

    private function localFileResponse(
        Request $request,
        string $absolutePath,
        string $mime,
        string $downloadName,
    ): BinaryFileResponse {
        $response = response()->file($absolutePath, $this->baseStreamHeaders($mime));
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE, $downloadName, true);

        if ($request->headers->has('Range')) {
            $response->prepare($request);
        }

        return $response;
    }

    /**
     * @param  \Illuminate\Contracts\Filesystem\Filesystem  $disk
     */
    private function remoteRangedStreamResponse(
        Request $request,
        $disk,
        string $path,
        string $mime,
        string $downloadName,
    ): StreamedResponse {
        $size = (int) $disk->size($path);
        abort_unless($size > 0, 404);

        [$start, $end, $status] = $this->parseByteRange($request, $size);
        $length = $end - $start + 1;

        $headers = $this->baseStreamHeaders($mime);
        $headers['Content-Length'] = (string) $length;
        $headers['Content-Disposition'] = $this->inlineDisposition($downloadName);

        if ($status === 206) {
            $headers['Content-Range'] = sprintf('bytes %d-%d/%d', $start, $end, $size);
        }

        return response()->stream(
            function () use ($disk, $path, $start, $length): void {
                $stream = $disk->readStream($path);
                if (! is_resource($stream)) {
                    return;
                }

                try {
                    $this->skipStreamBytes($stream, $start);

                    $sent = 0;
                    while ($sent < $length && ! feof($stream)) {
                        $read = fread($stream, min(self::CHUNK_BYTES, $length - $sent));
                        if ($read === false || $read === '') {
                            break;
                        }

                        echo $read;
                        $sent += strlen($read);

                        if (connection_aborted()) {
                            break;
                        }
                    }
                } finally {
                    fclose($stream);
                }
            },
            $status,
            $headers,
        );
    }

    /** @return array{0: int, 1: int, 2: int} */
    private function parseByteRange(Request $request, int $size): array
    {
        $start = 0;
        $end = max(0, $size - 1);
        $status = 200;

        $range = trim((string) $request->header('Range', ''));
        if ($range !== '' && preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
            $start = (int) $matches[1];
            $end = $matches[2] !== '' ? (int) $matches[2] : $end;
            $start = max(0, min($start, $end));
            $end = min($end, $size - 1);
            $status = 206;
        }

        return [$start, $end, $status];
    }

    /** @param  resource  $stream */
    private function skipStreamBytes($stream, int $offset): void
    {
        if ($offset <= 0) {
            return;
        }

        if (@fseek($stream, $offset, SEEK_SET) === 0) {
            return;
        }

        $remaining = $offset;
        while ($remaining > 0 && ! feof($stream)) {
            $chunk = fread($stream, min(self::CHUNK_BYTES, $remaining));
            if ($chunk === false || $chunk === '') {
                break;
            }
            $remaining -= strlen($chunk);
        }
    }

    private function localAbsolutePath(string $diskName, string $storagePath): ?string
    {
        $driver = (string) config("filesystems.disks.{$diskName}.driver", '');
        if (! in_array($driver, ['local'], true)) {
            return null;
        }

        try {
            $absolute = Storage::disk($diskName)->path($storagePath);
        } catch (\Throwable) {
            return null;
        }

        return is_file($absolute) ? $absolute : null;
    }

    /** @return array<string, string> */
    private function baseStreamHeaders(string $mime): array
    {
        return [
            'Content-Type' => $mime,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'private, max-age=259200',
            'X-Content-Type-Options' => 'nosniff',
        ];
    }

    private function inlineDisposition(string $filename): string
    {
        $safe = str_replace(['"', "\r", "\n"], '', $filename);

        return 'inline; filename="'.$safe.'"';
    }

    private function resolveMimeType(FamilyMedia $media): string
    {
        $path = (string) $media->storage_path;
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $fromExt = match ($ext) {
            'mp4', 'm4v' => 'video/mp4',
            'webm' => 'video/webm',
            'mov' => 'video/quicktime',
            'm4a' => 'audio/mp4',
            'mp3' => 'audio/mpeg',
            'ogg' => 'audio/ogg',
            'webp' => 'image/webp',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => null,
        };

        if ($fromExt !== null) {
            return $fromExt;
        }

        $declared = strtolower(trim((string) ($media->mime_type ?? '')));
        if ($declared !== '' && $declared !== 'application/octet-stream') {
            return $declared;
        }

        return 'application/octet-stream';
    }
}
