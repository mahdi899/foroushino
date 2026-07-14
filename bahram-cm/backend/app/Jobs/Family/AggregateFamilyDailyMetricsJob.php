<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyCommentStatus;
use App\Models\Family;
use App\Models\FamilyActionResponse;
use App\Models\FamilyComment;
use App\Models\FamilyDailyMetric;
use App\Models\FamilyEntryEventDailyMetric;
use App\Models\FamilyMediaProgress;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Models\FamilySourceDailyMetric;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Idempotent daily rollup — safe to re-run for the same date (upserts).
 * Reads raw event tables ONCE per day here so dashboards never scan them directly.
 */
class AggregateFamilyDailyMetricsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public ?string $date = null) {}

    public function handle(): void
    {
        $date = $this->date ? \Carbon\Carbon::parse($this->date)->startOfDay() : now()->subDay()->startOfDay();
        $end = $date->copy()->endOfDay();

        $this->aggregateGlobal($date, $end);
        $this->aggregatePerFamily($date, $end);
        $this->aggregateSources($date, $end);
        $this->aggregateEntryEvents($date, $end);
    }

    private function aggregateGlobal(\Carbon\Carbon $date, \Carbon\Carbon $end): void
    {
        FamilyDailyMetric::query()->updateOrCreate(
            ['family_id' => null, 'date' => $date->toDateString()],
            [
                'new_members' => FamilyMembership::query()->whereBetween('joined_at', [$date, $end])->count(),
                'posts_published' => FamilyPost::query()->whereBetween('published_at', [$date, $end])->count(),
                'reactions' => FamilyReaction::query()->whereBetween('created_at', [$date, $end])->count(),
                'comments_approved' => FamilyComment::query()->where('status', FamilyCommentStatus::Approved->value)->whereBetween('approved_at', [$date, $end])->count(),
                'comments_pending' => FamilyComment::query()->whereBetween('created_at', [$date, $end])->count(),
                'actions_completed' => FamilyActionResponse::query()->whereBetween('created_at', [$date, $end])->count(),
                'voice_plays' => FamilyMediaProgress::query()->whereBetween('updated_at', [$date, $end])->count(),
                'video_plays' => 0,
            ]
        );
    }

    private function aggregatePerFamily(\Carbon\Carbon $date, \Carbon\Carbon $end): void
    {
        Family::query()->select('id')->chunkById(200, function ($families) use ($date, $end) {
            foreach ($families as $family) {
                FamilyDailyMetric::query()->updateOrCreate(
                    ['family_id' => $family->id, 'date' => $date->toDateString()],
                    [
                        'new_members' => FamilyMembership::query()->where('family_id', $family->id)->whereBetween('joined_at', [$date, $end])->count(),
                        'reactions' => FamilyReaction::query()->where('family_id', $family->id)->whereBetween('created_at', [$date, $end])->count(),
                        'comments_approved' => FamilyComment::query()->where('family_id', $family->id)->where('status', FamilyCommentStatus::Approved->value)->whereBetween('approved_at', [$date, $end])->count(),
                        'comments_pending' => FamilyComment::query()->where('family_id', $family->id)->whereBetween('created_at', [$date, $end])->count(),
                        'actions_completed' => FamilyActionResponse::query()->where('family_id', $family->id)->whereBetween('created_at', [$date, $end])->count(),
                    ]
                );
            }
        });
    }

    private function aggregateSources(\Carbon\Carbon $date, \Carbon\Carbon $end): void
    {
        $counts = FamilyMembership::query()
            ->whereBetween('joined_at', [$date, $end])
            ->whereNotNull('entry_source')
            ->selectRaw('entry_source, COUNT(*) as c')
            ->groupBy('entry_source')
            ->pluck('c', 'entry_source');

        foreach ($counts as $source => $count) {
            FamilySourceDailyMetric::query()->updateOrCreate(
                ['source' => $source, 'date' => $date->toDateString()],
                ['joins' => $count]
            );
        }
    }

    private function aggregateEntryEvents(\Carbon\Carbon $date, \Carbon\Carbon $end): void
    {
        $counts = FamilyMembership::query()
            ->whereBetween('joined_at', [$date, $end])
            ->whereNotNull('entry_event_id')
            ->selectRaw('entry_event_id, COUNT(*) as c')
            ->groupBy('entry_event_id')
            ->pluck('c', 'entry_event_id');

        foreach ($counts as $eventId => $count) {
            FamilyEntryEventDailyMetric::query()->updateOrCreate(
                ['entry_event_id' => $eventId, 'date' => $date->toDateString()],
                ['joins' => $count]
            );
        }
    }
}
