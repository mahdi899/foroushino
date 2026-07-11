<?php

namespace App\Services\Identity;

use App\Models\IdentityVerificationArtifact;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IdentityArtifactStorage
{
    public function disk(): string
    {
        return (string) config('bahram.uploads.private_disk', 'local');
    }

    /**
     * @return array{disk: string, path: string, mime_type: ?string, size_bytes: int, original_name: string}
     */
    public function storeUploadedFile(
        UploadedFile $file,
        string $userUuid,
        string $submissionUuid,
        string $type,
    ): array {
        $extension = $file->getClientOriginalExtension() ?: $file->extension() ?: 'bin';
        $filename = $type.'.'.$extension;
        $directory = "identity-verifications/{$userUuid}/{$submissionUuid}";
        $disk = $this->disk();

        $path = $file->storeAs($directory, $filename, $disk);

        return [
            'disk' => $disk,
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => (int) $file->getSize(),
            'original_name' => $file->getClientOriginalName(),
        ];
    }

    public function stream(IdentityVerificationArtifact $artifact): StreamedResponse
    {
        $disk = Storage::disk($artifact->disk ?: $this->disk());

        abort_unless($disk->exists($artifact->path), 404);

        return $disk->response(
            $artifact->path,
            $artifact->original_name ?: basename($artifact->path),
            [
                'Content-Type' => $artifact->mime_type ?: 'application/octet-stream',
                'Cache-Control' => 'private, no-store',
            ],
        );
    }

    public function delete(IdentityVerificationArtifact $artifact): bool
    {
        $disk = Storage::disk($artifact->disk ?: $this->disk());

        if ($disk->exists($artifact->path)) {
            return $disk->delete($artifact->path);
        }

        return true;
    }
}
