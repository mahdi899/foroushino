<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyStoryResource;
use App\Services\Family\FamilyStoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class StoryController extends Controller
{
    public function __construct(private readonly FamilyStoryService $stories) {}

    public function index(): JsonResponse
    {
        $stories = $this->stories->activeStories();

        return ApiResponse::success(
            FamilyStoryResource::collection($stories)->resolve(),
        );
    }
}
