<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyDailyMetric;
use App\Models\FamilyEntryEventDailyMetric;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Models\FamilySourceDailyMetric;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Live family-manager analytics. Posts/reactions are counted from current rows
 * (published posts still present; reaction rows still present on those posts),
 * not from historical daily rollups that stay inflated after delete/archive.
 */
class FamilyAnalyticsService
{
    /**
     * @return array{
     *     daily: list<array<string, mixed>>,
     *     sources: list<array{source: mixed, source_label: string, joins: int}>,
     *     entry_events: list<array{entry_event_id: mixed, name: ?string, joins: int}>
     * }
     */
    public function dashboard(int $days): array
    {
        $days = max(1, min(90, $days));
        $since = now()->subDays($days)->startOfDay();

        $rollup = FamilyDailyMetric::query()
            ->whereNull('family_id')
            ->where('date', '>=', $since)
            ->orderBy('date')
            ->get([
                'date',
                'new_members',
                'posts_published',
                'reactions',
                'comments_approved',
                'comments_pending',
                'actions_completed',
                'voice_plays',
                'video_plays',
            ])
            ->keyBy(fn (FamilyDailyMetric $row) => $row->date->toDateString());

        $livePostsByDate = $this->livePublishedPostsByDate($since);
        $liveReactionsByDate = $this->liveReactionsByDate($since);

        $dates = $rollup->keys()
            ->merge($livePostsByDate->keys())
            ->merge($liveReactionsByDate->keys())
            ->unique()
            ->sort()
            ->values();

        $daily = $dates->map(function (string $date) use ($rollup, $livePostsByDate, $liveReactionsByDate) {
            $row = $rollup->get($date);

            return [
                'date' => $date,
                'new_members' => (int) ($row?->new_members ?? 0),
                'posts_published' => (int) ($livePostsByDate->get($date) ?? 0),
                'reactions' => (int) ($liveReactionsByDate->get($date) ?? 0),
                'comments_approved' => (int) ($row?->comments_approved ?? 0),
                'comments_pending' => (int) ($row?->comments_pending ?? 0),
                'actions_completed' => (int) ($row?->actions_completed ?? 0),
                'voice_plays' => (int) ($row?->voice_plays ?? 0),
                'video_plays' => (int) ($row?->video_plays ?? 0),
            ];
        })->all();

        $sources = FamilySourceDailyMetric::query()
            ->where('date', '>=', $since)
            ->selectRaw('source, SUM(joins) as joins')
            ->groupBy('source')
            ->orderByDesc('joins')
            ->get()
            ->map(fn ($row) => [
                'source' => $row->source,
                'source_label' => \App\Enums\Family\FamilyEntrySource::tryFrom((string) $row->source)?->label() ?? $row->source,
                'joins' => (int) $row->joins,
            ])
            ->all();

        $entryEvents = FamilyEntryEventDailyMetric::query()
            ->with('entryEvent:id,name')
            ->where('date', '>=', $since)
            ->selectRaw('entry_event_id, SUM(joins) as joins')
            ->groupBy('entry_event_id')
            ->orderByDesc('joins')
            ->get()
            ->map(fn ($e) => [
                'entry_event_id' => $e->entry_event_id,
                'name' => $e->entryEvent?->name,
                'joins' => (int) $e->joins,
            ])
            ->all();

        return [
            'daily' => $daily,
            'sources' => $sources,
            'entry_events' => $entryEvents,
        ];
    }

    /**
     * Currently published posts (not draft/archived/deleted), bucketed by published_at date.
     *
     * @return Collection<string, int>
     */
    public function livePublishedPostsByDate(CarbonInterface $since): Collection
    {
        return FamilyPost::query()
            ->where('status', FamilyPostStatus::Published)
            ->whereNotNull('published_at')
            ->where('published_at', '>=', $since)
            ->get(['published_at'])
            ->countBy(fn (FamilyPost $post) => $post->published_at->toDateString());
    }

    /**
     * Reaction rows that still exist on currently published posts, bucketed by created_at date.
     *
     * @return Collection<string, int>
     */
    public function liveReactionsByDate(CarbonInterface $since): Collection
    {
        return FamilyReaction::query()
            ->where('family_reactions.created_at', '>=', $since)
            ->whereHas('post', fn ($q) => $q->where('status', FamilyPostStatus::Published))
            ->get(['created_at'])
            ->countBy(fn (FamilyReaction $reaction) => $reaction->created_at->toDateString());
    }

    public function countLivePublishedPosts(CarbonInterface $since, ?CarbonInterface $until = null): int
    {
        $query = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published)
            ->whereNotNull('published_at')
            ->where('published_at', '>=', $since);

        if ($until) {
            $query->where('published_at', '<=', $until);
        }

        return $query->count();
    }

    public function countLiveReactions(CarbonInterface $since, ?CarbonInterface $until = null, ?int $familyId = null): int
    {
        $query = FamilyReaction::query()
            ->where('family_reactions.created_at', '>=', $since)
            ->whereHas('post', fn ($q) => $q->where('status', FamilyPostStatus::Published));

        if ($until) {
            $query->where('family_reactions.created_at', '<=', $until);
        }

        if ($familyId !== null) {
            $query->where('family_id', $familyId);
        }

        return $query->count();
    }
}
