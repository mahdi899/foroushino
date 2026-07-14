<?php

namespace App\Services\Ai;

use App\Models\Lead;
use App\Models\LeadScore;

class LeadScoringService
{
    /**
     * @return array{score: int, factors: array<string, mixed>}
     */
    public function score(Lead $lead): array
    {
        $base = match (true) {
            $lead->call_count === 0 && $lead->conversion_probability >= 50 => 6,
            $lead->temperature?->value === 'hot' => 8,
            $lead->temperature?->value === 'warm' => 4,
            default => 2,
        };
        $factors = [
            'temperature' => $lead->temperature?->value,
            'conversion_probability' => $lead->conversion_probability,
            'call_count' => $lead->call_count,
            'priority_base' => $base,
        ];

        $score = min(100, max(0, (int) round(
            ($lead->conversion_probability ?? 40) * 0.5
            + ($base * 8)
            + ($lead->temperature?->value === 'hot' ? 15 : 0)
        )));

        LeadScore::query()->updateOrCreate(
            ['lead_id' => $lead->id],
            [
                'score' => $score,
                'factors' => $factors,
                'model_version' => 'heuristic-v1',
                'computed_at' => now(),
            ],
        );

        return ['score' => $score, 'factors' => $factors];
    }
}
