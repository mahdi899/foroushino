<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\ConfirmMediaOptimizeRequest;
use App\Http\Requests\V1\ConfirmMediaReplaceRequest;
use App\Http\Requests\V1\PreviewMediaOptimizeRequest;
use App\Http\Resources\V1\MediaResource;
use App\Models\Media;
use App\Services\ImageOptimizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MediaOptimizeController extends Controller
{
    public function __construct(private readonly ImageOptimizerService $optimizer)
    {
    }

    public function preview(PreviewMediaOptimizeRequest $request): JsonResponse
    {
        $data = $this->optimizer->createPreview($request->file('file'));

        return response()->json(['data' => $data]);
    }

    public function confirm(ConfirmMediaOptimizeRequest $request): JsonResponse
    {
        $media = $this->optimizer->confirm(
            $request->validated('session_id'),
            $request->validated('variant'),
            $request->validated('alt_fa'),
            $request->user()->id,
            $request->validated('category'),
        );

        return response()->json(['data' => new MediaResource($media)], 201);
    }

    public function previewExisting(Request $request, Media $medium): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('media.write'), 403);

        return response()->json(['data' => $this->optimizer->createPreviewFromMedia($medium)]);
    }

    public function confirmReplace(ConfirmMediaReplaceRequest $request, Media $medium): JsonResponse
    {
        $media = $this->optimizer->confirmReplace(
            $request->validated('session_id'),
            $medium,
            $request->validated('variant'),
            $request->validated('alt_fa'),
        );

        return response()->json(['data' => new MediaResource($media)]);
    }

    public function discard(Request $request, string $session): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('media.write'), 403);
        $this->optimizer->discard($session);

        return response()->json(null, 204);
    }

    public function previewFile(Request $request, string $session, string $variant): BinaryFileResponse
    {
        abort_unless($request->hasValidSignature(), 403);
        abort_unless(in_array($variant, ['original', 'optimized'], true), 404);

        $path = $this->optimizer->previewFilePath($session, $variant);
        abort_unless($path && is_file($path), 404);

        return response()->file($path, [
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
