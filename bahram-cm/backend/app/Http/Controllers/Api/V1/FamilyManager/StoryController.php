<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyStoryResource;
use App\Models\FamilyMedia;
use App\Models\FamilyStory;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyStoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function __construct(
        private readonly FamilyStoryService $stories,
        private readonly AdminAuditLogger $audit,
    ) {}

    public function index(): JsonResponse
    {
        $stories = FamilyStory::query()
            ->with(['media', 'publisher:id,name'])
            ->orderByDesc('published_at')
            ->limit(50)
            ->get();

        return ApiResponse::success(
            FamilyStoryResource::collection($stories)->resolve(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'media_id' => ['required', 'integer', 'exists:family_media,id'],
            'caption' => ['nullable', 'string', 'max:500'],
        ]);

        $media = FamilyMedia::query()->findOrFail($data['media_id']);
        $story = $this->stories->publish($request->user(), $media, $data['caption'] ?? null);
        $this->audit->log($request->user(), 'family.story_published', $story);

        return ApiResponse::success((new FamilyStoryResource($story))->resolve(), 201);
    }

    public function destroy(Request $request, FamilyStory $story): JsonResponse
    {
        $this->audit->log($request->user(), 'family.story_deleted', $story);
        $this->stories->delete($story);

        return ApiResponse::success(['deleted' => true]);
    }
}
