<?php

namespace App\Console\Commands;

use App\Enums\FollowupStatus;
use App\Enums\LeadStatus;
use App\Enums\NotificationKind;
use App\Models\FollowUp;
use App\Models\LeadStatusHistory;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class MarkOverdueFollowUpsCommand extends Command
{
    protected $signature = 'followups:mark-overdue';

    protected $description = 'Flags pending follow-ups past their due date as overdue and updates the linked lead status.';

    public function handle(NotificationService $notifications): int
    {
        $overdue = FollowUp::query()
            ->where('status', FollowupStatus::Pending)
            ->where('due_at', '<', now())
            ->with(['lead', 'agent'])
            ->get();

        foreach ($overdue as $followUp) {
            $followUp->status = FollowupStatus::Overdue;
            $followUp->save();

            $lead = $followUp->lead;
            if ($lead && $lead->status === LeadStatus::FollowUpRequired) {
                $lead->status = LeadStatus::FollowUpOverdue;
                $lead->save();

                LeadStatusHistory::query()->create([
                    'lead_id' => $lead->id,
                    'status' => LeadStatus::FollowUpOverdue,
                    'by_user_id' => null,
                    'note' => 'پیگیری موعد گذشت (خودکار)',
                ]);
            }

            if ($followUp->agent) {
                $notifications->notify(
                    $followUp->agent,
                    NotificationKind::Followup,
                    'پیگیری عقب افتاد',
                    "پیگیری «{$followUp->title}» از موعد گذشت.",
                    '/followups',
                );
            }
        }

        $this->info("Marked {$overdue->count()} follow-up(s) as overdue.");

        return self::SUCCESS;
    }
}
