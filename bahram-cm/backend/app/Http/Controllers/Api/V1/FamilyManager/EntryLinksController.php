<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyEntrySource;
use App\Http\Controllers\Controller;
use App\Models\FamilyEntryLink;
use App\Services\Family\FamilyEntryLinkService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EntryLinksController extends Controller
{
    public function __construct(
        private readonly FamilyEntryLinkService $links,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $days = min(365, (int) $request->query('days', 30));

        $items = FamilyEntryLink::query()
            ->with([
                'entryEvent:id,name,external_reference,type',
                'family:id,internal_name',
            ])
            ->when($request->query('active') === '1', fn ($q) => $q->where('is_active', true))
            ->when($request->filled('family_id'), fn ($q) => $q->where('family_id', (int) $request->query('family_id')))
            ->orderByDesc('created_at')
            ->limit(min(200, (int) $request->query('limit', 100)))
            ->get()
            ->map(fn (FamilyEntryLink $link) => $this->present($link, $days));

        return ApiResponse::success($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'source' => ['required', Rule::enum(FamilyEntrySource::class)],
            'family_id' => ['required', 'integer', 'exists:families,id'],
            'campaign' => ['nullable', 'string', 'max:120'],
            'topic' => ['nullable', 'string', 'max:120'],
            'external_reference' => ['nullable', 'string', 'max:120'],
        ]);

        $link = $this->links->create($data, $request->user());

        return ApiResponse::success($this->present($link->fresh(['entryEvent', 'family']), 30), 201);
    }

    public function show(FamilyEntryLink $entryLink): JsonResponse
    {
        $entryLink->load([
            'entryEvent:id,name,external_reference,type',
            'family:id,internal_name',
        ]);

        return ApiResponse::success($this->present($entryLink, 365));
    }

    public function members(Request $request, FamilyEntryLink $entryLink): JsonResponse
    {
        $request->merge([
            'entry_event_id' => $entryLink->entry_event_id,
            'family_id' => $entryLink->family_id,
        ]);

        return app(FamiliesController::class)->members($request);
    }

    public function update(Request $request, FamilyEntryLink $entryLink): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'family_id' => ['sometimes', 'integer', 'exists:families,id'],
            'campaign' => ['nullable', 'string', 'max:120'],
            'topic' => ['nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $link = $this->links->update($entryLink, $data);

        return ApiResponse::success($this->present($link->load(['entryEvent', 'family']), 30));
    }

    public function destroy(FamilyEntryLink $entryLink): JsonResponse
    {
        $this->links->deactivate($entryLink);

        return ApiResponse::success(['deactivated' => true]);
    }

    /** @return array<string, mixed> */
    private function present(FamilyEntryLink $link, int $days): array
    {
        return [
            'id' => $link->id,
            'name' => $link->name,
            'slug' => $link->slug,
            'source' => $link->source?->value ?? $link->source,
            'source_label' => $link->source instanceof FamilyEntrySource ? $link->source->label() : null,
            'campaign' => $link->campaign,
            'topic' => $link->topic,
            'entry_event_id' => $link->entry_event_id,
            'family_id' => $link->family_id,
            'family_name' => $link->relationLoaded('family') && $link->family
                ? $link->family->internal_name
                : null,
            'is_active' => (bool) $link->is_active,
            'url' => $this->links->buildUrl($link),
            'joins_total' => $this->links->joinCount($link),
            'joins_period' => $this->links->joinCount($link, $days),
            'entry_event' => $link->relationLoaded('entryEvent') && $link->entryEvent
                ? [
                    'id' => $link->entryEvent->id,
                    'name' => $link->entryEvent->name,
                    'external_reference' => $link->entryEvent->external_reference,
                    'type' => $link->entryEvent->type?->value ?? $link->entryEvent->type,
                ]
                : null,
            'created_at' => $link->created_at?->toIso8601String(),
        ];
    }
}
