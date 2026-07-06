<?php

namespace App\Support;

use App\Enums\SuggestReason;
use App\Models\Lead;

/**
 * Shared SQL score expression + reason resolver used by both the atomic
 * `AssignNextLeadAction` (which locks its pick) and the read-only home/dashboard
 * "next lead" preview (which must not lock or mutate anything).
 */
class LeadPriorityScore
{
    public static function sqlExpression(): string
    {
        return <<<'SQL'
            (CASE
                WHEN next_followup_at IS NOT NULL AND next_followup_at < NOW() AND next_followup_at < CURDATE() THEN 1000
                WHEN next_followup_at IS NOT NULL AND next_followup_at >= CURDATE() AND next_followup_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 900
                WHEN temperature = 'hot' AND next_followup_at IS NOT NULL AND next_followup_at >= CURDATE() AND next_followup_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 800
                WHEN (stage = 'interested' OR temperature = 'hot') AND call_count > 0 THEN 700
                WHEN call_count = 0 AND conversion_probability >= 50 THEN 600
                WHEN temperature = 'warm' THEN 400
                ELSE 200
            END)
            + (CASE temperature WHEN 'hot' THEN 3 WHEN 'warm' THEN 2 ELSE 1 END) * 30
            + priority * 20
            + conversion_probability
            SQL;
    }

    public static function reasonFor(Lead $lead): SuggestReason
    {
        $now = now();

        if ($lead->next_followup_at && $lead->next_followup_at->lt($now) && ! $lead->next_followup_at->isToday()) {
            return SuggestReason::OverdueFollowUp;
        }

        if ($lead->next_followup_at?->isToday()) {
            return $lead->temperature->value === 'hot' ? SuggestReason::HotInWindow : SuggestReason::TodayFollowUp;
        }

        if (($lead->stage->value === 'interested' || $lead->temperature->value === 'hot') && $lead->call_count > 0) {
            return SuggestReason::InterestedNeedsFollowUp;
        }

        if ($lead->call_count === 0 && $lead->conversion_probability >= 50) {
            return SuggestReason::FreshHighProb;
        }

        return match ($lead->temperature->value) {
            'warm' => SuggestReason::Warm,
            'hot' => SuggestReason::InterestedNeedsFollowUp,
            default => SuggestReason::Cold,
        };
    }
}
