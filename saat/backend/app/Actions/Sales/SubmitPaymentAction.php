<?php

namespace App\Actions\Sales;

use App\Enums\LeadStatus;
use App\Enums\PaymentStatus;
use App\Enums\SaleStatus;
use App\Models\LeadStatusHistory;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SubmitPaymentAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Sale $sale, array $data, User $agent): Sale
    {
        if ($sale->status !== SaleStatus::PaymentPending) {
            throw new RuntimeException('این فروش در وضعیت قابل ثبت پرداخت نیست.');
        }

        return DB::transaction(function () use ($sale, $data, $agent) {
            Payment::query()->create([
                'sale_id' => $sale->id,
                'amount' => $data['amount'] ?? $sale->amount,
                'method' => $data['method'],
                'reference_number' => $data['reference_number'] ?? null,
                'status' => PaymentStatus::Submitted,
                'submitted_at' => now(),
            ]);

            $sale->status = SaleStatus::PaymentSubmitted;
            $sale->payment_method = $data['method'];
            $sale->submitted_at = now();
            $sale->save();

            $lead = $sale->lead;
            $lead->status = LeadStatus::PaymentSubmitted;
            $lead->save();

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::PaymentSubmitted,
                'by_user_id' => $agent->id,
                'note' => 'پرداخت ثبت شد، در انتظار بررسی لیدر',
            ]);

            return $sale->fresh(['payments']);
        });
    }
}
