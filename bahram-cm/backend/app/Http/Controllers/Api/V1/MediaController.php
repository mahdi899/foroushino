<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreMediaRequest;
use App\Http\Requests\V1\UpdateMediaRequest;
use App\Http\Resources\V1\MediaResource;
use App\Models\Media;
use App\Services\MediaService;
use App\Support\ApiQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function __construct(private readonly MediaService $service)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->hasPermission('media.read'), 403);

        $query = Media::query()->where('is_private', false)->latest();
        $query = ApiQuery::apply(
            $query,
            $request,
            filterable: ['type', 'category'],
            searchable: ['alt_fa', 'path', 'original_filename'],
            filterMap: [
                'category' => function ($q, $value) {
                    if ($value === 'عکس‌های سایت') {
                        $q->whereIn('category', ['عکس‌های سایت', 'سایت']);
                    } else {
                        $q->where('category', $value);
                    }
                },
            ],
        );

        return MediaResource::collection($query->paginate(ApiQuery::perPage($request, 50, 200)));
    }

    public function trashIndex(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->hasPermission('media.read'), 403);

        $cutoff = now()->subHours(Media::TRASH_RETENTION_HOURS);

        $query = Media::onlyTrashed()
            ->where('is_private', false)
            ->where('deleted_at', '>', $cutoff)
            ->latest('deleted_at');

        return MediaResource::collection($query->paginate(ApiQuery::perPage($request, 25)));
    }

    public function trashCount(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('media.read'), 403);

        $cutoff = now()->subHours(Media::TRASH_RETENTION_HOURS);
        $count = Media::onlyTrashed()
            ->where('is_private', false)
            ->where('deleted_at', '>', $cutoff)
            ->count();

        return response()->json(['data' => ['count' => $count]]);
    }

    public function store(StoreMediaRequest $request): JsonResponse
    {
        $media = $this->service->storePublic(
            $request->file('file'),
            $request->input('alt_fa'),
            $request->user()->id,
            $request->input('category'),
        );

        return response()->json(['data' => new MediaResource($media)], 201);
    }

    public function update(UpdateMediaRequest $request, Media $medium): JsonResponse
    {
        abort_unless(! $medium->is_private, 403);

        $media = $this->service->updateMetadata(
            $medium,
            $request->validated('alt_fa'),
            $request->validated('category'),
        );

        return response()->json(['data' => new MediaResource($media)]);
    }

    public function destroy(Request $request, Media $medium): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('media.write'), 403);
        abort_unless(! $medium->is_private, 403);

        $this->service->trash($medium);

        return response()->json([
            'data' => [
                'id' => $medium->id,
                'deleted_at' => $medium->deleted_at?->toIso8601String(),
                'purge_at' => $medium->deleted_at
                    ?->copy()
                    ->addHours(Media::TRASH_RETENTION_HOURS)
                    ->toIso8601String(),
            ],
        ]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('media.write'), 403);

        $media = $this->service->restore($id);

        return response()->json(['data' => new MediaResource($media)]);
    }

    /** Signed download for private patient uploads. */
    public function download(Request $request, Media $medium): StreamedResponse
    {
        abort_unless($request->hasValidSignature() || $request->user()?->hasPermission('media.read'), 403);
        abort_unless(Storage::disk($medium->disk)->exists($medium->path), 404);

        return Storage::disk($medium->disk)->download($medium->path);
    }
}
