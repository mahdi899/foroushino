<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyMediaType;
use App\Http\Controllers\Controller;
use App\Models\FamilyMedia;
use App\Models\FamilyMediaUploadSession;
use App\Services\Family\FamilyMediaIngestService;
use App\Support\ApiResponse;
use App\Support\FamilyMediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MediaController extends Controller
{
    public function __construct(
        private readonly FamilyMediaIngestService $ingest,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $this->assertMultipartFileReceived($request, 'file');

        $data = $request->validate([
            'type' => ['required', Rule::enum(FamilyMediaType::class)],
            'file' => ['required', 'file'],
        ]);

        $file = $request->file('file');
        if ($file !== null && ! $file->isValid()) {
            throw ValidationException::withMessages([
                'file' => [$this->uploadErrorMessage($file->getError())],
            ]);
        }

        $media = $this->ingest->ingestSimple(
            $request->user(),
            $file,
            $data['type'],
            $this->parseOptimizeImages($request),
        );

        return ApiResponse::success($this->present($media), 201);
    }

    public function createSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(FamilyMediaType::class)],
            'filename' => ['required', 'string', 'max:255'],
            'total_size' => ['required', 'integer', 'min:1'],
            'chunk_size' => ['nullable', 'integer', 'min:1'],
            'mime_type' => ['nullable', 'string'],
        ]);

        $chunkSize = $data['chunk_size'] ?? ((int) config('family.media.chunk_size_mb', 5) * 1024 * 1024);
        $this->assertChunkSizeWithinPhpLimit($chunkSize);

        $session = $this->ingest->createChunkSession(
            $request->user(),
            $data['type'],
            $data['filename'],
            $data['total_size'],
            $chunkSize,
            $data['mime_type'] ?? null,
            $this->parseOptimizeImages($request),
        );

        return ApiResponse::success([
            'ulid' => $session->ulid,
            'total_chunks' => $session->total_chunks,
            'chunk_size' => $session->chunk_size,
        ], 201);
    }

    public function uploadChunk(Request $request, FamilyMediaUploadSession $session): JsonResponse
    {
        $this->assertMultipartFileReceived($request, 'chunk');

        $data = $request->validate([
            'index' => ['required', 'integer', 'min:0'],
            'chunk' => ['required', 'file'],
        ]);

        $chunk = $request->file('chunk');
        if ($chunk !== null && ! $chunk->isValid()) {
            throw ValidationException::withMessages([
                'chunk' => [$this->uploadErrorMessage($chunk->getError())],
            ]);
        }

        $binary = file_get_contents($chunk->getRealPath());
        $updated = $this->ingest->appendChunk($session, (int) $data['index'], $binary);

        return ApiResponse::success([
            'received_chunks' => $updated->received_chunks,
            'total_chunks' => $updated->total_chunks,
        ]);
    }

    public function completeSession(FamilyMediaUploadSession $session): JsonResponse
    {
        $media = $this->ingest->completeSession($session);

        return ApiResponse::success($this->present($media), 201);
    }

    public function show(FamilyMedia $medium): JsonResponse
    {
        return ApiResponse::success($this->present($medium));
    }

    public function retry(FamilyMedia $medium): JsonResponse
    {
        $media = $this->ingest->retry($medium);

        return ApiResponse::success($this->present($media));
    }

    /** @return array<string, mixed> */
    private function present(FamilyMedia $media): array
    {
        return [
            'id' => $media->id,
            'type' => $media->type?->value,
            'status' => $media->status?->value,
            'original_filename' => $media->original_filename,
            'size' => $media->size,
            'duration' => $media->duration,
            'width' => $media->width,
            'height' => $media->height,
            'failure_reason' => $media->failure_reason,
            'cdn_url' => $media->cdnUrl(),
            'url' => FamilyMediaUrl::fromPath($media->storage_path, $media->disk),
            // storage_path and disk credentials are intentionally never exposed.
        ];
    }

    private function parseOptimizeImages(Request $request): ?bool
    {
        if (! $request->has('optimize_images')) {
            return null;
        }

        $raw = $request->input('optimize_images');
        if ($raw === null || $raw === '') {
            return null;
        }

        return filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $raw;
    }

    private function assertMultipartFileReceived(Request $request, string $field): void
    {
        if ($request->hasFile($field)) {
            return;
        }

        $contentType = strtolower((string) $request->header('Content-Type', ''));
        if (! $request->isMethod('POST') || ! str_contains($contentType, 'multipart/form-data')) {
            return;
        }

        throw ValidationException::withMessages([
            $field => [
                'فایل به سرور نرسید. احتمالاً حجم آن از محدودیت آپلود PHP (upload_max_filesize='
                .ini_get('upload_max_filesize').') بیشتر است.',
            ],
        ]);
    }

    private function assertChunkSizeWithinPhpLimit(int $chunkSizeBytes): void
    {
        $limit = $this->parseIniSizeBytes((string) ini_get('upload_max_filesize'));
        if ($limit > 0 && $chunkSizeBytes > $limit) {
            throw ValidationException::withMessages([
                'chunk_size' => [
                    'اندازه chunk از upload_max_filesize PHP بیشتر است. upload_max_filesize='
                    .ini_get('upload_max_filesize').' — chunk را کوچک‌تر کنید یا PHP را تنظیم کنید.',
                ],
            ]);
        }
    }

    private function uploadErrorMessage(int $errorCode): string
    {
        return match ($errorCode) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'حجم فایل از محدودیت سرور بیشتر است (upload_max_filesize='.ini_get('upload_max_filesize').').',
            UPLOAD_ERR_PARTIAL => 'آپلود ناقص بود. دوباره تلاش کنید.',
            UPLOAD_ERR_NO_FILE => 'فایلی انتخاب نشده است.',
            UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION => 'خطای سرور هنگام دریافت فایل. با پشتیبانی تماس بگیرید.',
            default => 'آپلود فایل ناموفق بود.',
        };
    }

    private function parseIniSizeBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        return (int) match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
