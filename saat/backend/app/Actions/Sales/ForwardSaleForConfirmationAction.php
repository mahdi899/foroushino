<?php

namespace App\Actions\Sales;

use App\Enums\LeadStatus;
use App\Enums\SaleStatus;
use App\Models\LeadStatusHistory;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ForwardSaleForConfirmationAction
{
    public function execute(Sale $sale, User $reviewer): Sale
    {
        if ($sale->status !== SaleStatus::PaymentSubmitted) {
            throw new RuntimeException('این فروش در وضعیت قابل ارسال به مدیریت نیست.');
        }

        return DB::transaction(function () use ($sale, $reviewer) {
            $sale->status = SaleStatus::PendingConfirmation;
            $sale->save();

            $lead = $sale->lead;
            $lead->status = LeadStatus::SalePendingConfirmation;
            $lead->save();

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::SalePendingConfirmation,
                'by_user_id' => $reviewer->id,
                'note' => 'تایید لیدر تیم — ارسال برای تایید مدیریت',
            ]);

            return $sale->fresh(['lead', 'product', 'agent', 'payments']);
        });
    }
}
