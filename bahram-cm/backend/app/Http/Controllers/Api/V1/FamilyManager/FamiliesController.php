<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Services\Family\FamilyIntelligenceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FamiliesController extends Controller
{
    public function __construct(
        private readonly FamilyIntelligenceService $intelligence,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Family::query()->withCount('memberships');

        if ($search = $request->query('search')) {
            $query->where('internal_name', 'like', "%{$search}%");
        }

        if ($lifecycle = $request->query('lifecycle')) {
            $query->where('lifecycle', $lifecycle);
        }

        $families = $query->orderByDesc('member_count')->paginate(min(100, (int) $request->query('per_page', 30)));

        $items = collect($families->items())->map(fn (Family $f) => $this->present($f));

        return ApiResponse::success($items, 200, [
            'current_page' => $families->currentPage(),
            'last_page' => $families->lastPage(),
            'total' => $families->total(),
        ]);
    }

    public function show(Family $family): JsonResponse
    {
        $family->loadCount('memberships');

        $latestDna = $family->dnaSnapshots()->latest('period_end')->first();
        $newMembers7d = $family->memberships()->where('joined_at', '>=', now()->subDays(7))->count();

        return ApiResponse::success(array_merge($this->present($family), [
            'new_members_7d' => $newMembers7d,
            'dna' => $latestDna ? [
                'voice_engagement' => (float) $latestDna->voice_engagement,
                'video_engagement' => (float) $latestDna->video_engagement,
                'reaction_rate' => (float) $latestDna->reaction_rate,
                'comment_rate' => (float) $latestDna->comment_rate,
                'action_commitment' => (float) $latestDna->action_commitment,
                'action_completion' => (float) $latestDna->action_completion,
                'sales_interest' => (float) $latestDna->sales_interest,
                'campaign_interest' => (float) $latestDna->campaign_interest,
                'mindset_interest' => (float) $latestDna->mindset_interest,
                'calculated_at' => $latestDna->calculated_at?->toIso8601String(),
            ] : null,
        ]));
    }

    public function audienceSuggestions(): JsonResponse
    {
        return ApiResponse::success($this->intelligence->suggestAudience());
    }

    /** @return array<string, mixed> */
    private function present(Family $family): array
    {
        return [
            'id' => $family->id,
            'internal_name' => $family->internal_name,
            'lifecycle' => $family->lifecycle?->value ?? $family->lifecycle,
            'member_count' => (int) $family->member_count,
            'capacity_target' => (int) $family->capacity_target,
            'capacity_max' => (int) $family->capacity_max,
            'primary_source' => $family->primary_source,
            'entry_event_id' => $family->entry_event_id,
        ];
    }
}
