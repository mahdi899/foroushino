<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyStoryResource;
use App\Models\FamilyStory;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyStoryService;
use App\Services\Family\StoryAudienceResolver;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function __construct(
        private readonly FamilyStoryService $stories,
        private readonly FamilyAccessService $access,
        private readonly StoryAudienceResolver $audience,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());
        $stories = $this->stories->activeStories((int) $membership->family_id);

        return ApiResponse::success(
            FamilyStoryResource::collection($stories)->resolve(),
        );
    }

    public function recordView(Request $request, FamilyStory $story): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());
        abort_unless($story->expires_at && $story->expires_at->isFuture(), 404);
        abort_unless($this->audience->visibleToFamily($story, (int) $membership->family_id), 404);

        $this->stories->recordView($story, $request->user());

        return ApiResponse::success(['recorded' => true]);
    }
}
