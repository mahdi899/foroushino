<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyMedia;
use App\Models\FamilyPostBlock;
use App\Models\FamilyStory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class FamilyMediaStreamService
{
    public function assertStreamable(FamilyMedia $media): void
    {
        abort_unless($media->status === FamilyMediaStatus::Ready, 404);
        abort_unless(filled($media->storage_path), 404);

        $inPublishedPost = FamilyPostBlock::query()
            ->where('media_id', $media->id)
            ->whereHas('post', fn ($query) => $query->where('status', FamilyPostStatus::Published))
            ->exists();

        $inActiveStory = FamilyStory::query()
            ->where('media_id', $media->id)
            ->where('expires_at', '>', now())
            ->exists();

        abort_unless($inPublishedPost || $inActiveStory, 404);
    }

    public function response(Request $request, FamilyMedia $media): StreamedResponse
    {
        $diskName = $media->disk ?: config('family.media.disk', 'public');
        $disk = Storage::disk($diskName);

        abort_unless($disk->exists($media->storage_path), 404);

        $mime = $this->resolveMimeType($media);
        $downloadName = $media->original_filename ?: basename($media->storage_path);

        $response = $disk->response(
            $media->storage_path,
            $downloadName,
            [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline',
                'Accept-Ranges' => 'bytes',
                'Cache-Control' => 'private, max-age=259200',
            ],
        );

        if ($request->headers->has('Range')) {
            $response->prepare($request);
        }

        return $response;
    }

    private function resolveMimeType(FamilyMedia $media): string
    {
        $declared = trim((string) ($media->mime_type ?? ''));
        if ($declared !== '' && $declared !== 'application/octet-stream') {
            return $declared;
        }

        $path = (string) $media->storage_path;
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($ext) {
            'mp4', 'm4v' => 'video/mp4',
            'webm' => 'video/webm',
            'mov' => 'video/quicktime',
            'm4a' => 'audio/mp4',
            'mp3' => 'audio/mpeg',
            'ogg' => 'audio/ogg',
            'webp' => 'image/webp',
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => 'application/octet-stream',
        };
    }
}
