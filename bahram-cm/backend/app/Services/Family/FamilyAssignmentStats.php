<?php

namespace App\Services\Family;

/**
 * Pre-aggregated membership distributions for assignment scoring.
 */
final class FamilyAssignmentStats
{
    /** @param array<int, int> $totals family_id => member count */
    public function __construct(
        public readonly array $totals,
        /** @var array<int, array<string, int>> family_id => [source => count] */
        public readonly array $sourceCounts,
        /** @var array<int, array<int, int>> family_id => [entry_event_id => count] */
        public readonly array $eventCounts,
    ) {}

    public function sourcePercent(int $familyId, ?string $source): float
    {
        if ($source === null || $source === '') {
            return 0.0;
        }

        $total = $this->totals[$familyId] ?? 0;
        if ($total <= 0) {
            return 0.0;
        }

        $count = $this->sourceCounts[$familyId][$source] ?? 0;

        return ($count / $total) * 100;
    }

    public function eventPercent(int $familyId, ?int $entryEventId): float
    {
        if ($entryEventId === null) {
            return 0.0;
        }

        $total = $this->totals[$familyId] ?? 0;
        if ($total <= 0) {
            return 0.0;
        }

        $count = $this->eventCounts[$familyId][$entryEventId] ?? 0;

        return ($count / $total) * 100;
    }
}
