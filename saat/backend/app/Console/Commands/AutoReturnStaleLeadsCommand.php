<?php

namespace App\Console\Commands;

use App\Enums\LeadStatus;
use App\Models\AppSetting;
use App\Models\Lead;
use App\Models\LeadStatusHistory;
use Illuminate\Console\Command;

class AutoReturnStaleLeadsCommand extends Command
{
    protected $signature = 'leads:auto-return-stale';

    protected $description = 'Returns assigned leads with no recent call activity back to the shared pool.';

    public function handle(): int
    {
        $hours = max(1, AppSetting::int('lead_pool_auto_return_hours', 48));
        $cutoff = now()->subHours($hours);

        $leads = Lead::query()
            ->whereNotNull('assigned_agent_id')
            ->whereNull('do_not_call_at')
            ->whereIn('status', [
                LeadStatus::Assigned->value,
                LeadStatus::Queued->value,
                LeadStatus::FollowUpRequired->value,
                LeadStatus::New->value,
            ])
            ->where('updated_at', '<', $cutoff)
            ->where(function ($query) use ($cutoff): void {
                $query->whereNull('last_call_at')
                    ->orWhere('last_call_at', '<', $cutoff);
            })
            ->get();

        $count = 0;

        foreach ($leads as $lead) {
            $lead->update([
                'assigned_agent_id' => null,
                'locked_by' => null,
                'locked_until' => null,
                'returned_to_pool' => true,
                'status' => LeadStatus::ReturnedToPool,
            ]);

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::ReturnedToPool,
                'by_user_id' => null,
                'note' => "بازگشت خودکار به استخر پس از {$hours} ساعت بدون فعالیت",
            ]);

            $count++;
        }

        $this->info("Returned {$count} stale assigned lead(s) to the pool.");

        return self::SUCCESS;
    }
}
