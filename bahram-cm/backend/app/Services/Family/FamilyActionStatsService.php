<?php

namespace App\Services\Family;

use App\Models\FamilyAction;
use App\Models\FamilyActionResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

final class FamilyActionStatsService
{
    public function __construct(
        private readonly ActionResultStatsBuilder $builder,
    ) {}

    public function forAction(int $familyId, FamilyAction $action): ?array
    {
        $ttl = (int) config('family.cache.action_stats_ttl', 60);

        return Cache::remember(
            $this->cacheKey($familyId, (int) $action->id),
            $ttl,
            fn () => $this->buildFromDatabase($familyId, $action),
        );
    }

    public function forget(int $familyId, int $actionId): void
    {
        Cache::forget($this->cacheKey($familyId, $actionId));
    }

    private function cacheKey(int $familyId, int $actionId): string
    {
        return "family:action_stats:{$familyId}:{$actionId}";
    }

    private function buildFromDatabase(int $familyId, FamilyAction $action): ?array
    {
        /** @var Collection<int, FamilyActionResponse> $responses */
        $responses = FamilyActionResponse::query()
            ->where('family_id', $familyId)
            ->where('action_id', $action->id)
            ->get(['action_id', 'value']);

        return $this->builder->build($action, $responses);
    }
}
