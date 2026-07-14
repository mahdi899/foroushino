<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyReactionType;
use App\Models\FamilyComment;
use App\Models\FamilyPostStat;
use App\Models\FamilyReaction;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FamilyStatsService
{
    public function ensureStatRow(int $postId, int $familyId): FamilyPostStat
    {
        return FamilyPostStat::query()->firstOrCreate(
            ['post_id' => $postId, 'family_id' => $familyId],
            [
                'fire_count' => 0,
                'heart_count' => 0,
                'target_count' => 0,
                'clap_count' => 0,
                'approved_comments_count' => 0,
                'action_responses_count' => 0,
            ]
        );
    }

    public function incrementReaction(int $postId, int $familyId, FamilyReactionType|string $type, int $delta = 1): void
    {
        $column = $this->reactionColumn($type);
        $stat = $this->ensureStatRow($postId, $familyId);

        FamilyPostStat::query()
            ->whereKey($stat->id)
            ->update([
                $column => $this->nonNegativeIncrement($column, $delta),
                'updated_at' => now(),
            ]);

        $this->bumpHotCounter($postId, $familyId, $column, $delta);
    }

    public function setReaction(
        int $postId,
        int $familyId,
        ?FamilyReactionType $oldType,
        FamilyReactionType $newType,
    ): void {
        if ($oldType && $oldType === $newType) {
            return;
        }

        if ($oldType) {
            $this->incrementReaction($postId, $familyId, $oldType, -1);
        }

        $this->incrementReaction($postId, $familyId, $newType, 1);
    }

    public function removeReaction(int $postId, int $familyId, FamilyReactionType $type): void
    {
        $this->decrementReaction($postId, $familyId, $type);
    }

    public function decrementReaction(int $postId, int $familyId, FamilyReactionType|string $type, int $delta = 1): void
    {
        $this->incrementReaction($postId, $familyId, $type, -abs($delta));
    }

    public function incrementApprovedComments(int $postId, int $familyId, int $delta = 1): void
    {
        $stat = $this->ensureStatRow($postId, $familyId);

        FamilyPostStat::query()
            ->whereKey($stat->id)
            ->update([
                'approved_comments_count' => $this->nonNegativeIncrement('approved_comments_count', $delta),
                'updated_at' => now(),
            ]);

        $this->bumpHotCounter($postId, $familyId, 'approved_comments_count', $delta);
    }

    public function incrementActionResponses(int $postId, int $familyId, int $delta = 1): void
    {
        $stat = $this->ensureStatRow($postId, $familyId);

        FamilyPostStat::query()
            ->whereKey($stat->id)
            ->update([
                'action_responses_count' => $this->nonNegativeIncrement('action_responses_count', $delta),
                'updated_at' => now(),
            ]);
    }

    /**
     * Portable "clamp at zero after increment" expression — works on both
     * MySQL and SQLite (used by the test suite), unlike MySQL-only GREATEST().
     */
    private function nonNegativeIncrement(string $column, int $delta): \Illuminate\Database\Query\Expression
    {
        return DB::raw("(CASE WHEN ({$column} + ({$delta})) < 0 THEN 0 ELSE ({$column} + ({$delta})) END)");
    }

    public function rebuildForPost(int $postId): void
    {
        $familyIds = FamilyReaction::query()
            ->where('post_id', $postId)
            ->pluck('family_id')
            ->merge(
                FamilyComment::query()->where('post_id', $postId)->pluck('family_id')
            )
            ->unique()
            ->values();

        foreach ($familyIds as $familyId) {
            $counts = FamilyReaction::query()
                ->where('post_id', $postId)
                ->where('family_id', $familyId)
                ->selectRaw('type, COUNT(*) as c')
                ->groupBy('type')
                ->pluck('c', 'type');

            $approved = FamilyComment::query()
                ->where('post_id', $postId)
                ->where('family_id', $familyId)
                ->where('status', 'approved')
                ->count();

            $stat = $this->ensureStatRow($postId, $familyId);
            $stat->update([
                'fire_count' => (int) ($counts['fire'] ?? 0),
                'heart_count' => (int) ($counts['heart'] ?? 0),
                'target_count' => (int) ($counts['target'] ?? 0),
                'clap_count' => (int) ($counts['clap'] ?? 0),
                'approved_comments_count' => $approved,
            ]);
        }
    }

    private function reactionColumn(FamilyReactionType|string $type): string
    {
        $value = $type instanceof FamilyReactionType ? $type->value : $type;

        return match ($value) {
            'fire' => 'fire_count',
            'heart' => 'heart_count',
            'target' => 'target_count',
            'clap' => 'clap_count',
            default => throw new \InvalidArgumentException("Unknown reaction type: {$value}"),
        };
    }

    private function bumpHotCounter(int $postId, int $familyId, string $field, int $delta): void
    {
        try {
            $key = "family:stats:{$postId}:{$familyId}:{$field}";
            if ($delta >= 0) {
                Cache::increment($key, $delta);
            } else {
                Cache::decrement($key, abs($delta));
            }
        } catch (\Throwable) {
            // Redis optional for hot counters — MySQL remains source of truth.
        }
    }
}
