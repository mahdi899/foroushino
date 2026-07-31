<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyStoryResource;
use App\Services\Family\FamilyBrandingService;
use App\Services\Family\FamilyStoryService;
use App\Support\ApiResponse;
use App\Support\HttpCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BrandingController extends Controller
{
    public function __construct(
        private readonly FamilyBrandingService $branding,
        private readonly FamilyStoryService $stories,
    ) {}

    public function show(Request $request): JsonResponse|Response
    {
        $payload = [
            ...$this->branding->publicPayload(),
            'has_active_stories' => $this->stories->hasActiveStories(),
            'latest_story_id' => $this->stories->latestActiveStoryId(),
        ];
        $etag = HttpCache::etag(
            'branding',
            $payload['display_name'] ?? '',
            $payload['profile_name'] ?? '',
            (int) ($payload['latest_story_id'] ?? 0),
            (int) ($payload['has_active_stories'] ?? 0),
        );

        return HttpCache::conditionalJson(
            $request,
            $payload,
            $etag,
            HttpCache::publicMaxAge((int) config('family.cache.branding_ttl', 300)),
        );
    }
}
