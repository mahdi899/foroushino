<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyCommentStatus;
use App\Models\FamilyActionResponse;
use App\Models\FamilyComment;
use App\Models\FamilyMediaProgress;
use App\Models\FamilyReaction;
use App\Models\FamilyUserBehaviorProfile;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Rebuildable behavioral read model. Never used as source of truth;
 * safe to delete family_user_behavior_profiles and re-run.
 */
class RebuildFamilyBehaviorProfilesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function handle(): void
    {
        User::query()
            ->whereHas('familyMembership')
            ->chunkById(200, function ($users) {
                foreach ($users as $user) {
                    $this->rebuildFor($user);
                }
            });
    }

    private function rebuildFor(User $user): void
    {
        $progress = FamilyMediaProgress::query()->where('user_id', $user->id)->get();
        $voiceProgress = $progress->avg('completion_percent') ?? 0;

        $reactionCount = FamilyReaction::query()->where('user_id', $user->id)->count();
        $commentCount = FamilyComment::query()
            ->where('user_id', $user->id)
            ->where('status', FamilyCommentStatus::Approved->value)
            ->count();

        $responses = FamilyActionResponse::query()->where('user_id', $user->id)->get();
        $commitments = $responses->filter(fn ($r) => isset($r->value['committed']) || isset($r->value['confirmed']));
        $completions = $responses->filter(fn ($r) => ($r->value['confirmed'] ?? false) === true);

        $commitmentScore = $responses->isNotEmpty()
            ? round(($commitments->count() / max(1, $responses->count())) * 100, 2)
            : 0;
        $executionScore = $commitments->isNotEmpty()
            ? round(($completions->count() / max(1, $commitments->count())) * 100, 2)
            : 0;

        FamilyUserBehaviorProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'voice_completion_score' => round((float) $voiceProgress, 2),
                'video_completion_score' => round((float) $voiceProgress, 2),
                'reaction_score' => min(100, $reactionCount * 2),
                'comment_score' => min(100, $commentCount * 5),
                'commitment_score' => $commitmentScore,
                'execution_score' => $executionScore,
                'sales_affinity' => 0,
                'campaign_affinity' => 0,
                'mindset_affinity' => 0,
                'calculated_at' => now(),
            ]
        );
    }
}
