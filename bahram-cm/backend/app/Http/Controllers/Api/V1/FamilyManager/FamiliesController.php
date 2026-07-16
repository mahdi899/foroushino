<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyEntrySource;
use App\Enums\Family\FamilyLifecycle;
use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\FamilyEntryEvent;
use App\Services\Family\FamilyIntelligenceService;
use App\Services\Family\FamilyManagementService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FamiliesController extends Controller
{
    public function __construct(
        private readonly FamilyIntelligenceService $intelligence,
        private readonly FamilyManagementService $management,
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

        $families = $query->with('entryEvent')->orderByDesc('member_count')->paginate(min(100, (int) $request->query('per_page', 30)));

        $items = collect($families->items())->map(fn (Family $f) => $this->present($f));

        return ApiResponse::success($items, 200, [
            'current_page' => $families->currentPage(),
            'last_page' => $families->lastPage(),
            'total' => $families->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'internal_name' => ['nullable', 'string', 'max:120'],
            'lifecycle' => ['nullable', Rule::enum(FamilyLifecycle::class)],
            'primary_source' => ['nullable', Rule::enum(FamilyEntrySource::class)],
            'entry_event_id' => ['nullable', 'integer', 'exists:family_entry_events,id'],
            'capacity_target' => ['nullable', 'integer', 'min:100', 'max:20000'],
            'capacity_min' => ['nullable', 'integer', 'min:100', 'max:20000'],
            'capacity_max' => ['nullable', 'integer', 'min:100', 'max:20000'],
            'accepting_members' => ['nullable', 'boolean'],
            'profile_description' => ['nullable', 'string', 'max:500'],
            'profile_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $family = $this->management->create($data);

        return ApiResponse::success($this->present($family->fresh(['entryEvent'])), 201);
    }

    public function show(Family $family): JsonResponse
    {
        $family->load(['entryEvent'])->loadCount('memberships');

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

    public function update(Request $request, Family $family): JsonResponse
    {
        $data = $request->validate([
            'internal_name' => ['sometimes', 'string', 'max:120'],
            'lifecycle' => ['sometimes', Rule::enum(FamilyLifecycle::class)],
            'primary_source' => ['nullable', Rule::enum(FamilyEntrySource::class)],
            'entry_event_id' => ['nullable', 'integer', 'exists:family_entry_events,id'],
            'capacity_target' => ['sometimes', 'integer', 'min:100', 'max:20000'],
            'capacity_min' => ['sometimes', 'integer', 'min:100', 'max:20000'],
            'capacity_max' => ['sometimes', 'integer', 'min:100', 'max:20000'],
            'accepting_members' => ['sometimes', 'boolean'],
            'profile_description' => ['nullable', 'string', 'max:500'],
            'profile_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $family = $this->management->update($family, $data);

        return ApiResponse::success($this->present($family));
    }

    public function destroy(Family $family): JsonResponse
    {
        $this->management->delete($family);

        return ApiResponse::success(['deleted' => true]);
    }

    public function entryEvents(Request $request): JsonResponse
    {
        $events = FamilyEntryEvent::query()
            ->when($search = $request->query('search'), function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('external_reference', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('started_at')
            ->limit(min(100, (int) $request->query('limit', 50)))
            ->get()
            ->map(fn (FamilyEntryEvent $event) => [
                'id' => $event->id,
                'name' => $event->name,
                'type' => $event->type?->value ?? $event->type,
                'external_reference' => $event->external_reference,
                'topic' => $event->topic,
            ]);

        return ApiResponse::success($events);
    }

    public function audienceSuggestions(): JsonResponse
    {
        return ApiResponse::success($this->intelligence->suggestAudience());
    }

    /** @return array<string, mixed> */
    private function present(Family $family): array
    {
        $profile = is_array($family->metadata['profile'] ?? null)
            ? $family->metadata['profile']
            : [];

        return [
            'id' => $family->id,
            'internal_name' => $family->internal_name,
            'lifecycle' => $family->lifecycle?->value ?? $family->lifecycle,
            'accepting_members' => (bool) $family->accepting_members,
            'member_count' => (int) $family->member_count,
            'capacity_target' => (int) $family->capacity_target,
            'capacity_min' => (int) ($family->capacity_min ?? 0),
            'capacity_max' => (int) $family->capacity_max,
            'primary_source' => $family->primary_source,
            'entry_event_id' => $family->entry_event_id,
            'entry_event' => $family->relationLoaded('entryEvent') && $family->entryEvent
                ? [
                    'id' => $family->entryEvent->id,
                    'name' => $family->entryEvent->name,
                    'external_reference' => $family->entryEvent->external_reference,
                ]
                : null,
            'profile' => [
                'description' => $profile['description'] ?? null,
                'notes' => $profile['notes'] ?? null,
            ],
        ];
    }
}
