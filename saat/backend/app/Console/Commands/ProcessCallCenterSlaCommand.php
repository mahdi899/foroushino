<?php

namespace App\Console\Commands;

use App\Models\FollowUp;
use App\Models\Lead;
use App\Services\Quality\QaSampler;
use Illuminate\Console\Command;

class ProcessCallCenterSlaCommand extends Command
{
    protected $signature = 'callcenter:process-sla';

    protected $description = 'Mark SLA breaches and enqueue QA samples';

    public function handle(QaSampler $sampler): int
    {
        $breached = FollowUp::query()
            ->where('status', 'overdue')
            ->where('due_at', '<', now()->subHours(2))
            ->count();

        $campaignBreaches = FollowUp::query()
            ->whereIn('status', ['pending', 'overdue'])
            ->whereHas('lead.campaign', fn ($q) => $q->where('is_active', true))
            ->whereRaw('follow_ups.due_at < DATE_SUB(NOW(), INTERVAL (
                SELECT sla_callback_minutes FROM campaigns WHERE campaigns.id = (
                    SELECT campaign_id FROM leads WHERE leads.id = follow_ups.lead_id
                )
            ) MINUTE)')
            ->count();

        $this->info("Overdue follow-ups beyond SLA window: {$breached}");
        $this->info("Campaign SLA callback breaches: {$campaignBreaches}");

        Lead::query()
            ->whereNotNull('locked_until')
            ->where('locked_until', '<', now()->subHours(24))
            ->whereNotNull('locked_by')
            ->update(['locked_by' => null, 'locked_until' => null]);

        $sampler->samplePending();

        $this->info('SLA processing complete.');

        return self::SUCCESS;
    }
}
