<?php

namespace App\Services\Campaign;

use App\Models\Campaign;
use App\Models\Lead;
use Illuminate\Database\Eloquent\Builder;

class CampaignDialingPolicy
{
    public function canDial(Lead $lead): DialingEligibility
    {
        $campaign = $this->resolveCampaign($lead);

        if (! $campaign) {
            return DialingEligibility::allowed();
        }

        if (! $this->isWithinAllowedHours($campaign)) {
            return DialingEligibility::denied(
                "تماس در بازه مجاز کمپین «{$campaign->name}» نیست ({$campaign->allowed_hours_start} تا {$campaign->allowed_hours_end}).",
            );
        }

        if ($this->dailyAttempts($lead) >= $campaign->max_daily_attempts) {
            return DialingEligibility::denied('سقف تماس روزانه این کمپین برای این مشتری پر شده است.');
        }

        if ($this->totalAttempts($lead) >= $campaign->max_total_attempts) {
            return DialingEligibility::denied('سقف کل تماس‌های این کمپین برای این مشتری پر شده است.');
        }

        if ($this->isInCooldown($lead, $campaign)) {
            return DialingEligibility::denied(
                "باید {$campaign->retry_cooldown_minutes} دقیقه از آخرین تماس این مشتری بگذرد.",
            );
        }

        return DialingEligibility::allowed();
    }

    public function applyCandidateConstraints(Builder $query): Builder
    {
        return $query
            ->where(function (Builder $outer): void {
                $outer->whereNull('campaign_id')
                    ->orWhereHas('campaign', function (Builder $campaign): void {
                        $campaign->where('is_active', true)
                            ->whereRaw('TIME(?) BETWEEN allowed_hours_start AND allowed_hours_end', [now()->format('H:i:s')])
                            ->whereRaw(
                                '(SELECT COUNT(*) FROM calls WHERE calls.lead_id = leads.id AND DATE(calls.created_at) = CURDATE()) < campaigns.max_daily_attempts',
                            )
                            ->whereRaw('leads.call_count < campaigns.max_total_attempts')
                            ->whereRaw(
                                'NOT EXISTS (
                                    SELECT 1 FROM calls recent
                                    WHERE recent.lead_id = leads.id
                                    AND recent.created_at >= DATE_SUB(NOW(), INTERVAL campaigns.retry_cooldown_minutes MINUTE)
                                )',
                            );
                    })
                    ->orWhereHas('campaign', fn (Builder $campaign) => $campaign->where('is_active', false));
            });
    }

    public function campaignPriorityBonusSql(): string
    {
        return <<<'SQL'
            COALESCE((
                SELECT c.priority
                FROM campaigns c
                WHERE c.id = leads.campaign_id AND c.is_active = 1
            ), 0) * 5
            SQL;
    }

    private function resolveCampaign(Lead $lead): ?Campaign
    {
        $campaign = $lead->relationLoaded('campaign')
            ? $lead->campaign
            : $lead->campaign()->first();

        if (! $campaign || ! $campaign->is_active) {
            return null;
        }

        if ($campaign->starts_at && $campaign->starts_at->isFuture()) {
            return null;
        }

        if ($campaign->ends_at && $campaign->ends_at->isPast()) {
            return null;
        }

        return $campaign;
    }

    private function isWithinAllowedHours(Campaign $campaign): bool
    {
        $now = now()->format('H:i');
        $start = $campaign->allowed_hours_start ?: '08:00';
        $end = $campaign->allowed_hours_end ?: '23:59';

        if ($start <= $end) {
            return $now >= $start && $now <= $end;
        }

        return $now >= $start || $now <= $end;
    }

    private function dailyAttempts(Lead $lead): int
    {
        if ($lead->last_call_at?->isToday()) {
            return $lead->calls()->whereDate('created_at', today())->count();
        }

        return 0;
    }

    private function totalAttempts(Lead $lead): int
    {
        return (int) $lead->call_count;
    }

    private function isInCooldown(Lead $lead, Campaign $campaign): bool
    {
        $lastAt = $lead->last_call_at;

        if (! $lastAt) {
            return false;
        }

        return $lastAt->gt(now()->subMinutes($campaign->retry_cooldown_minutes));
    }
}
