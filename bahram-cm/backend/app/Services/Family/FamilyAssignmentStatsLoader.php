<?php

namespace App\Services\Family;

use App\Models\FamilyMembership;
use Illuminate\Support\Collection;

class FamilyAssignmentStatsLoader
{
    /**
     * @param  Collection<int, \App\Models\Family>|array<int, \App\Models\Family>  $families
     */
    public function load(Collection|array $families): FamilyAssignmentStats
    {
        $familyIds = collect($families)->pluck('id')->map(fn ($id) => (int) $id)->all();

        if ($familyIds === []) {
            return new FamilyAssignmentStats([], [], []);
        }

        $totals = [];
        foreach ($families as $family) {
            $totals[(int) $family->id] = (int) $family->member_count;
        }

        $sourceRows = FamilyMembership::query()
            ->whereIn('family_id', $familyIds)
            ->whereNotNull('entry_source')
            ->selectRaw('family_id, entry_source, COUNT(*) as aggregate_count')
            ->groupBy('family_id', 'entry_source')
            ->get();

        $sourceCounts = [];
        foreach ($sourceRows as $row) {
            $source = $row->entry_source;
            $sourceKey = $source instanceof \BackedEnum ? $source->value : (string) $source;
            $sourceCounts[(int) $row->family_id][$sourceKey] = (int) $row->aggregate_count;
        }

        $eventRows = FamilyMembership::query()
            ->whereIn('family_id', $familyIds)
            ->whereNotNull('entry_event_id')
            ->selectRaw('family_id, entry_event_id, COUNT(*) as aggregate_count')
            ->groupBy('family_id', 'entry_event_id')
            ->get();

        $eventCounts = [];
        foreach ($eventRows as $row) {
            $eventCounts[(int) $row->family_id][(int) $row->entry_event_id] = (int) $row->aggregate_count;
        }

        return new FamilyAssignmentStats($totals, $sourceCounts, $eventCounts);
    }
}
