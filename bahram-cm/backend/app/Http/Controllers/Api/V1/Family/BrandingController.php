<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyStoryResource;
use App\Services\Family\FamilyBrandingService;
use App\Services\Family\FamilyStoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class BrandingController extends Controller
{
    public function __construct(
        private readonly FamilyBrandingService $branding,
        private readonly FamilyStoryService $stories,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            ...$this->branding->publicPayload(),
            'has_active_stories' => $this->stories->hasActiveStories(),
            'latest_story_id' => $this->stories->latestActiveStoryId(),
        ]);
    }
}
