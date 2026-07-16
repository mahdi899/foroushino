<?php

namespace Tests\Unit\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Models\Family;
use App\Services\Family\EntryContext;
use App\Services\Family\FamilyAssignmentScorer;
use App\Services\Family\FamilyAssignmentStats;
use Tests\TestCase;

class FamilyAssignmentScorerTest extends TestCase
{
    public function test_prefers_family_with_matching_source_distribution(): void
    {
        $scorer = new FamilyAssignmentScorer;

        $context = new EntryContext(source: FamilyEntrySource::Instagram);

        $instagramHeavy = $this->makeFamily(id: 1, memberCount: 4700, primarySource: 'instagram');
        $websiteHeavy = $this->makeFamily(id: 2, memberCount: 4700, primarySource: 'website');

        $stats = new FamilyAssignmentStats(
            totals: [1 => 100, 2 => 100],
            sourceCounts: [
                1 => ['instagram' => 58, 'website' => 42],
                2 => ['instagram' => 12, 'website' => 88],
            ],
            eventCounts: [],
        );

        $this->assertGreaterThan(
            $scorer->score($websiteHeavy, $context, $stats),
            $scorer->score($instagramHeavy, $context, $stats),
        );
    }

    public function test_penalizes_homogeneous_entry_event_for_diversity(): void
    {
        $scorer = new FamilyAssignmentScorer;

        $context = new EntryContext(
            source: FamilyEntrySource::Instagram,
            entryEventId: 482,
        );

        $homogeneous = $this->makeFamily(id: 1, memberCount: 4000, entryEventId: 482);
        $diverse = $this->makeFamily(id: 2, memberCount: 4000, entryEventId: 482);

        $stats = new FamilyAssignmentStats(
            totals: [1 => 100, 2 => 100],
            sourceCounts: [
                1 => ['instagram' => 70],
                2 => ['instagram' => 70],
            ],
            eventCounts: [
                1 => [482 => 90],
                2 => [482 => 15],
            ],
        );

        $homogeneousScore = $scorer->score($homogeneous, $context, $stats);
        $diverseScore = $scorer->score($diverse, $context, $stats);

        $this->assertTrue(
            $diverseScore > $homogeneousScore,
            "Expected diverse family ({$diverseScore}) to outscore homogeneous ({$homogeneousScore})",
        );
    }

    private function makeFamily(int $id, int $memberCount, ?string $primarySource = null, ?int $entryEventId = null): Family
    {
        $family = new Family([
            'internal_name' => 'test',
            'member_count' => $memberCount,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'primary_source' => $primarySource,
            'entry_event_id' => $entryEventId,
            'accepting_members' => true,
        ]);
        $family->setAttribute('id', $id);

        return $family;
    }
}
