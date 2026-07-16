<?php

namespace App\Services\Family;

use App\Models\Family;

class FamilyAssignmentScorer
{
    /**
     * Returns a normalized score in [0, 1].
     */
    public function score(Family $family, EntryContext $context, FamilyAssignmentStats $stats): float
    {
        $weights = config('family.assignment_weights', []);
        $wSource = (float) ($weights['source_match'] ?? 0.35);
        $wEvent = (float) ($weights['entry_event'] ?? 0.30);
        $wCapacity = (float) ($weights['capacity_balance'] ?? 0.20);
        $wDiversity = (float) ($weights['family_diversity'] ?? 0.15);

        $sourceScore = $this->sourceScore($family, $context, $stats);
        $eventScore = $this->eventScore($family, $context, $stats);
        $capacityScore = $this->capacityScore($family);
        $diversityScore = $this->diversityScore($family, $context, $stats);

        return ($sourceScore * $wSource)
            + ($eventScore * $wEvent)
            + ($capacityScore * $wCapacity)
            + ($diversityScore * $wDiversity);
    }

    private function sourceScore(Family $family, EntryContext $context, FamilyAssignmentStats $stats): float
    {
        $source = $context->source?->value;

        if ($source === null) {
            return 0.5;
        }

        $percent = $stats->sourcePercent((int) $family->getKey(), $source);

        if ($family->member_count <= 0) {
            if ($family->primary_source === $source) {
                return 0.85;
            }

            return $family->primary_source === null ? 0.55 : 0.35;
        }

        return $this->percentToAffinityScore($percent, boost: 0.2, slope: 1.35);
    }

    private function eventScore(Family $family, EntryContext $context, FamilyAssignmentStats $stats): float
    {
        $eventId = $context->entryEventId;

        if ($eventId === null) {
            return 0.45;
        }

        $percent = $stats->eventPercent((int) $family->getKey(), $eventId);

        if ($family->member_count <= 0) {
            if ($family->entry_event_id === $eventId) {
                return 0.9;
            }

            return $family->entry_event_id === null ? 0.5 : 0.25;
        }

        return $this->applyEventSaturation(
            $this->percentToAffinityScore($percent, boost: 0.15, slope: 1.55),
            $percent,
        );
    }

    /**
     * Reduce entry-event affinity when the family is already saturated with the same event.
     */
    private function applyEventSaturation(float $score, float $eventPercent): float
    {
        if ($eventPercent <= 50) {
            return $score;
        }

        $penalty = min(0.45, (($eventPercent - 50) / 100) * 0.9);

        return max(0.15, $score * (1 - $penalty));
    }

    private function capacityScore(Family $family): float
    {
        $count = (int) $family->member_count;
        $min = max(1, (int) $family->capacity_min);
        $max = max($min + 1, (int) $family->capacity_max);
        $target = max($min, (int) $family->capacity_target);

        if ($count >= $max) {
            return 0.0;
        }

        if ($count < $min) {
            return min(0.85, 0.65 + 0.15 * ($count / $min));
        }

        if ($count >= $target) {
            $overflow = ($count - $target) / max(1, $max - $target);

            return max(0.2, 0.85 - $overflow * 0.5);
        }

        $progress = ($count - $min) / max(1, $target - $min);

        return min(0.9, 0.7 + 0.3 * $progress);
    }

    /**
     * Penalize adding more users from an entry event that already dominates the family.
     */
    private function diversityScore(Family $family, EntryContext $context, FamilyAssignmentStats $stats): float
    {
        $eventId = $context->entryEventId;

        if ($eventId === null) {
            return 0.75;
        }

        $percent = $stats->eventPercent((int) $family->getKey(), $eventId);

        if ($family->member_count <= 0) {
            return 0.85;
        }

        if ($percent <= 40) {
            return min(1.0, 0.85 + (40 - $percent) * 0.004);
        }

        if ($percent <= 55) {
            return 0.85 - (($percent - 40) / 15) * 0.35;
        }

        return max(0.15, 0.5 - ($percent - 55) * 0.012);
    }

    private function percentToAffinityScore(float $percent, float $boost, float $slope): float
    {
        $normalized = min(100.0, max(0.0, $percent));

        return min(1.0, $boost + ($normalized / 100) * $slope);
    }
}
