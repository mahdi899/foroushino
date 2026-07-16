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

class MediaController extends Controller
{
    public function __construct(
        private readonly FamilyMediaIngestService $ingest,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(FamilyMediaType::class)],
            'file' => ['required', 'file'],
        ]);

        $media = $this->ingest->ingestSimple($request->user(), $request->file('file'), $data['type']);

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

        $session = $this->ingest->createChunkSession(
            $request->user(),
            $data['type'],
            $data['filename'],
            $data['total_size'],
            $chunkSize,
            $data['mime_type'] ?? null,
        );

        return ApiResponse::success([
            'ulid' => $session->ulid,
            'total_chunks' => $session->total_chunks,
            'chunk_size' => $session->chunk_size,
        ], 201);
    }

    public function uploadChunk(Request $request, FamilyMediaUploadSession $session): JsonResponse
    {
        $data = $request->validate([
            'index' => ['required', 'integer', 'min:0'],
            'chunk' => ['required', 'file'],
        ]);

        $binary = file_get_contents($request->file('chunk')->getRealPath());
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
            'url' => FamilyMediaUrl::fromPath($media->storage_path),
            // storage_path and disk credentials are intentionally never exposed.
        ];
    }
}
