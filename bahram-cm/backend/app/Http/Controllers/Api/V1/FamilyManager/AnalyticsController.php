<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Http\Controllers\Controller;
use App\Services\Family\FamilyAnalyticsService;
use App\Services\Family\FamilyIntelligenceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly FamilyIntelligenceService $intelligence,
        private readonly FamilyAnalyticsService $analytics,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);

        return ApiResponse::success($this->analytics->dashboard($days));
    }

    public function dailySummary(Request $request): JsonResponse
    {
        $sampleSize = (int) $request->query('sample_size', 0);
        $topics = json_decode((string) $request->query('topics', '{}'), true) ?: [];

        return ApiResponse::success($this->intelligence->summarizeDaily($sampleSize, $topics));
    }
}
