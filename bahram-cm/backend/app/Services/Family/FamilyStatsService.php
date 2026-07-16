<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyReactionType;
use App\Models\FamilyComment;
use App\Models\FamilyPostStat;
use App\Models\FamilyPostView;
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
                'thumbs_up_count' => 0,
                'laugh_count' => 0,
                'sad_count' => 0,
                'party_count' => 0,
                'star_count' => 0,
                'rocket_count' => 0,
                'eyes_count' => 0,
                'pray_count' => 0,
                'muscle_count' => 0,
                'hundred_count' => 0,
                'wink_count' => 0,
                'approved_comments_count' => 0,
                'action_responses_count' => 0,
                'views_count' => 0,
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

    public function recordView(int $postId, int $familyId, int $userId): int
    {
        $now = now();
        $inserted = FamilyPostView::query()->insertOrIgnore([
            'post_id' => $postId,
            'family_id' => $familyId,
            'user_id' => $userId,
            'viewed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $stat = $this->ensureStatRow($postId, $familyId);

        if ($inserted > 0) {
            FamilyPostStat::query()
                ->whereKey($stat->id)
                ->update([
                    'views_count' => $this->nonNegativeIncrement('views_count', 1),
                    'updated_at' => now(),
                ]);
        }

        return (int) FamilyPostStat::query()->whereKey($stat->id)->value('views_count');
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
                'thumbs_up_count' => (int) ($counts['thumbs_up'] ?? 0),
                'laugh_count' => (int) ($counts['laugh'] ?? 0),
                'sad_count' => (int) ($counts['sad'] ?? 0),
                'party_count' => (int) ($counts['party'] ?? 0),
                'star_count' => (int) ($counts['star'] ?? 0),
                'rocket_count' => (int) ($counts['rocket'] ?? 0),
                'eyes_count' => (int) ($counts['eyes'] ?? 0),
                'pray_count' => (int) ($counts['pray'] ?? 0),
                'muscle_count' => (int) ($counts['muscle'] ?? 0),
                'hundred_count' => (int) ($counts['hundred'] ?? 0),
                'wink_count' => (int) ($counts['wink'] ?? 0),
                'approved_comments_count' => $approved,
            ]);

            $this->clearHotCounters($postId, (int) $familyId);
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
            'thumbs_up' => 'thumbs_up_count',
            'laugh' => 'laugh_count',
            'sad' => 'sad_count',
            'party' => 'party_count',
            'star' => 'star_count',
            'rocket' => 'rocket_count',
            'eyes' => 'eyes_count',
            'pray' => 'pray_count',
            'muscle' => 'muscle_count',
            'hundred' => 'hundred_count',
            'wink' => 'wink_count',
            default => throw new \InvalidArgumentException("Unknown reaction type: {$value}"),
        };
    }

    private function bumpHotCounter(int $postId, int $familyId, string $field, int $delta): void
    {
        // No-op: MySQL is updated synchronously and is the source of truth.
        // Previously Redis deltas were added on top of DB values in feedStats,
        // which double-counted and left stale keys after migrate:fresh.
    }

    /**
     * @return array<string, int>
     */
    public function feedStats(?FamilyPostStat $stat, int $postId = 0, int $familyId = 0): array
    {
        $fields = [
            'fire' => 'fire_count',
            'heart' => 'heart_count',
            'target' => 'target_count',
            'clap' => 'clap_count',
            'thumbs_up' => 'thumbs_up_count',
            'laugh' => 'laugh_count',
            'sad' => 'sad_count',
            'party' => 'party_count',
            'star' => 'star_count',
            'rocket' => 'rocket_count',
            'eyes' => 'eyes_count',
            'pray' => 'pray_count',
            'muscle' => 'muscle_count',
            'hundred' => 'hundred_count',
            'wink' => 'wink_count',
            'comments' => 'approved_comments_count',
            'action_responses' => 'action_responses_count',
            'views' => 'views_count',
        ];

        $result = [];
        foreach ($fields as $key => $column) {
            $result[$key] = max(0, (int) ($stat?->$column ?? 0));
        }

        return $result;
    }

    public function clearHotCounters(int $postId, int $familyId): void
    {
        $fields = [
            'fire_count',
            'heart_count',
            'target_count',
            'clap_count',
            'thumbs_up_count',
            'laugh_count',
            'sad_count',
            'party_count',
            'star_count',
            'rocket_count',
            'eyes_count',
            'pray_count',
            'muscle_count',
            'hundred_count',
            'wink_count',
            'approved_comments_count',
            'action_responses_count',
            'views_count',
        ];

        try {
            foreach ($fields as $field) {
                Cache::forget("family:stats:{$postId}:{$familyId}:{$field}");
            }
        } catch (\Throwable) {
            // Redis optional.
        }
    }
}
