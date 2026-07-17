<?php

namespace App\Actions\Sales;

use App\Enums\LeadStatus;
use App\Enums\NotificationKind;
use App\Enums\SaleStatus;
use App\Models\LeadStatusHistory;
use App\Models\Sale;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;

class RejectSaleAction
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function execute(Sale $sale, User $rejectedBy, string $reason): Sale
    {
        if ($sale->status !== SaleStatus::PendingConfirmation) {
            throw new \RuntimeException('این فروش در انتظار تایید نیست.');
        }

        return DB::transaction(function () use ($sale, $rejectedBy, $reason) {
            $sale->status = SaleStatus::Rejected;
            $sale->rejected_at = now();
            $sale->rejection_reason = $reason;
            $sale->save();

            $lead = $sale->lead;
            $lead->status = LeadStatus::FollowUpRequired;
            $lead->next_followup_at = now()->addHours(4);
            $lead->save();

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::FollowUpRequired,
                'by_user_id' => $rejectedBy->id,
                'note' => 'فروش رد شد: '.$reason,
            ]);

            $this->notifications->notify(
                $sale->agent,
                NotificationKind::Sale,
                'فروش رد شد',
                $reason,
                '/sales',
            );

            return $sale->fresh();
        });
    }
}
