<?php

namespace App\Services\Quality;

use App\Enums\CallResult;
use App\Models\Call;
use App\Models\QualityReview;

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
            QualityReview::query()->firstOrCreate(
                ['call_id' => $call->id],
                [
                    'reviewer_id' => $call->agent_id,
                    'agent_id' => $call->agent_id,
                    'score' => 0,
                    'status' => 'pending',
                ],
            );
        }
    }
}
