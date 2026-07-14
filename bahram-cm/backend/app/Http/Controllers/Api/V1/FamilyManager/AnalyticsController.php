<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Http\Controllers\Controller;
use App\Models\FamilyDailyMetric;
use App\Models\FamilyEntryEventDailyMetric;
use App\Models\FamilySourceDailyMetric;
use App\Services\Family\FamilyIntelligenceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly FamilyIntelligenceService $intelligence,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $days = min(90, (int) $request->query('days', 30));
        $since = now()->subDays($days)->startOfDay();

        $daily = FamilyDailyMetric::query()
            ->whereNull('family_id')
            ->where('date', '>=', $since)
            ->orderBy('date')
            ->get(['date', 'new_members', 'posts_published', 'reactions', 'comments_approved', 'comments_pending', 'actions_completed', 'voice_plays', 'video_plays']);

        $sources = FamilySourceDailyMetric::query()
            ->where('date', '>=', $since)
            ->selectRaw('source, SUM(joins) as joins')
            ->groupBy('source')
            ->orderByDesc('joins')
            ->get();

        $entryEvents = FamilyEntryEventDailyMetric::query()
            ->with('entryEvent:id,name')
            ->where('date', '>=', $since)
            ->selectRaw('entry_event_id, SUM(joins) as joins')
            ->groupBy('entry_event_id')
            ->orderByDesc('joins')
            ->get();

        return ApiResponse::success([
            'daily' => $daily,
            'sources' => $sources,
            'entry_events' => $entryEvents->map(fn ($e) => [
                'entry_event_id' => $e->entry_event_id,
                'name' => $e->entryEvent?->name,
                'joins' => (int) $e->joins,
            ]),
        ]);
    }

    public function dailySummary(Request $request): JsonResponse
    {
        $sampleSize = (int) $request->query('sample_size', 0);
        $topics = json_decode((string) $request->query('topics', '{}'), true) ?: [];

        return ApiResponse::success($this->intelligence->summarizeDaily($sampleSize, $topics));
    }
}
