<?php

namespace App\Services\Quality;

use App\Enums\CallResult;
use App\Enums\RoleName;
use App\Models\AppSetting;
use App\Models\Call;
use App\Models\QualityReview;
use App\Models\User;

class QaSampler
{
    /**
     * Sample calls that need supervisor review or random QA.
     */
    public function samplePending(int $limit = 20): void
    {
        $calls = Call::query()
            ->where('result', CallResult::IncompleteCall)
            ->whereDoesntHave('qualityReviews')
            ->latest()
            ->limit($limit)
            ->get();

        foreach ($calls as $call) {
            $this->createPendingReview($call);
        }
    }

    public function maybeSampleCall(Call $call): void
    {
        if ($call->result === CallResult::IncompleteCall) {
            $this->createPendingReview($call);

            return;
        }

        if (! in_array($call->result, [CallResult::VeryHot, CallResult::PaymentPending], true)) {
            return;
        }

        $percent = max(0, min(100, AppSetting::int('qa_sample_percent', 10)));
        if ($percent === 0) {
            return;
        }

        if (random_int(1, 100) > $percent) {
            return;
        }

        if ($call->qualityReviews()->exists()) {
            return;
        }

        $this->createPendingReview($call);
    }

    private function createPendingReview(Call $call): void
    {
        QualityReview::query()->firstOrCreate(
            ['call_id' => $call->id],
            [
                'reviewer_id' => $this->resolveReviewerId($call),
                'agent_id' => $call->agent_id,
                'score' => 0,
                'status' => 'pending',
            ],
        );
    }

    private function resolveReviewerId(Call $call): int
    {
        $agent = $call->agent;

        $supervisorId = User::query()
            ->role([RoleName::Supervisor->value, RoleName::Manager->value, RoleName::Admin->value])
            ->when($agent?->team_id, fn ($query) => $query->where('team_id', $agent->team_id))
            ->value('id');

        return (int) ($supervisorId ?? $agent->id);
    }
}
