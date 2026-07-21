<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyStoryResource;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyStoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function __construct(
        private readonly FamilyStoryService $stories,
        private readonly FamilyAccessService $access,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());
        $stories = $this->stories->activeStories((int) $membership->family_id);

        return ApiResponse::success(
            FamilyStoryResource::collection($stories)->resolve(),
        );
    }
}
