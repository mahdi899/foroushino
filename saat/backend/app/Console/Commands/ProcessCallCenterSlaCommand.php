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

        $this->info("Overdue follow-ups beyond SLA window: {$breached}");

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
