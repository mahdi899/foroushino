<?php

namespace App\Jobs\Family;

use App\Models\Family;
use App\Models\FamilyActionResponse;
use App\Models\FamilyComment;
use App\Models\FamilyDnaSnapshot;
use App\Models\FamilyMediaProgress;
use App\Models\FamilyMembership;
use App\Models\FamilyReaction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Periodic (not per-reaction) DNA snapshot per family over a rolling window.
 */
class CalculateFamilyDnaSnapshotJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $windowDays = 7) {}

    public function handle(): void
    {
        $end = now()->startOfDay();
        $start = $end->copy()->subDays($this->windowDays);

        Family::query()->select('id', 'member_count')->chunkById(200, function ($families) use ($start, $end) {
            foreach ($families as $family) {
                $this->snapshotFor($family, $start, $end);
            }
        });
    }

    private function snapshotFor(Family $family, \Carbon\Carbon $start, \Carbon\Carbon $end): void
    {
        $memberCount = max(1, $family->member_count);

        $memberIds = FamilyMembership::query()->where('family_id', $family->id)->pluck('user_id');

        $voiceAvg = FamilyMediaProgress::query()
            ->whereIn('user_id', $memberIds)
            ->whereBetween('updated_at', [$start, $end])
            ->avg('completion_percent') ?? 0;

        $reactionRate = FamilyReaction::query()
            ->where('family_id', $family->id)
            ->whereBetween('created_at', [$start, $end])
            ->count() / $memberCount;

        $commentRate = FamilyComment::query()
            ->where('family_id', $family->id)
            ->whereBetween('created_at', [$start, $end])
            ->count() / $memberCount;

        $responses = FamilyActionResponse::query()
            ->where('family_id', $family->id)
            ->whereBetween('created_at', [$start, $end])
            ->get();

        $commitments = $responses->filter(fn ($r) => isset($r->value['committed']) || isset($r->value['confirmed']));
        $completions = $responses->filter(fn ($r) => ($r->value['confirmed'] ?? false) === true);

        $actionCommitment = $responses->isNotEmpty() ? $commitments->count() / max(1, $responses->count()) : 0;
        $actionCompletion = $commitments->isNotEmpty() ? $completions->count() / max(1, $commitments->count()) : 0;

        FamilyDnaSnapshot::query()->updateOrCreate(
            [
                'family_id' => $family->id,
                'period_start' => $start->toDateString(),
                'period_end' => $end->toDateString(),
            ],
            [
                'voice_engagement' => round((float) $voiceAvg / 100, 4),
                'video_engagement' => round((float) $voiceAvg / 100, 4),
                'reaction_rate' => round($reactionRate, 4),
                'comment_rate' => round($commentRate, 4),
                'action_commitment' => round($actionCommitment, 4),
                'action_completion' => round($actionCompletion, 4),
                'sales_interest' => 0,
                'campaign_interest' => 0,
                'mindset_interest' => 0,
                'summary_json' => [
                    'member_count' => $family->member_count,
                    'sample_responses' => $responses->count(),
                ],
                'calculated_at' => now(),
            ]
        );
    }
}
