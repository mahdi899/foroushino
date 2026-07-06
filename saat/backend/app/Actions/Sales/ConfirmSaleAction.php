<?php

namespace App\Actions\Sales;

use App\Enums\ActivityKind;
use App\Enums\CommissionStatus;
use App\Enums\LeadStatus;
use App\Enums\NotificationKind;
use App\Enums\SaleStatus;
use App\Events\SaleConfirmed;
use App\Models\Commission;
use App\Models\LeadStatusHistory;
use App\Models\Sale;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\ActivityLogService;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Confirms a sale (manager/supervisor action): moves the sale to `confirmed`,
 * the lead to `won`, and — in the same DB transaction — creates the
 * commission (pending, held for a 3-day review window) and credits the
 * agent's wallet `balance_pending`. A sale never yields withdrawable money
 * directly; that only happens once the commission is later released.
 */
class ConfirmSaleAction
{
    private const HOLD_DAYS = 3;

    private const POINTS_PER_SALE = 50;

    public function __construct(
        private readonly WalletService $wallet,
        private readonly NotificationService $notifications,
        private readonly ActivityLogService $activity,
        private readonly AchievementService $achievements,
    ) {}

    public function execute(Sale $sale, User $confirmedBy): Commission
    {
        if ($sale->status === SaleStatus::Confirmed) {
            throw new RuntimeException('این فروش قبلاً تایید شده است.');
        }

        return DB::transaction(function () use ($sale, $confirmedBy) {
            $product = $sale->product;
            $rate = (float) ($product?->commission_rate ?? 15);
            $commissionAmount = round(((float) $sale->amount * $rate) / 100, 2);

            $sale->status = SaleStatus::Confirmed;
            $sale->confirmed_at = now();
            $sale->confirmed_by = $confirmedBy->id;
            $sale->save();

            $lead = $sale->lead;
            $lead->status = LeadStatus::Won;
            $lead->stage = \App\Enums\SaleStage::Won;
            $lead->save();

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::Won,
                'by_user_id' => $confirmedBy->id,
                'note' => 'فروش تایید شد',
            ]);

            $commission = Commission::query()->create([
                'sale_id' => $sale->id,
                'agent_id' => $sale->agent_id,
                'product_id' => $sale->product_id,
                'lead_id' => $sale->lead_id,
                'sale_amount' => $sale->amount,
                'commission_rate' => $rate,
                'commission_amount' => $commissionAmount,
                'status' => CommissionStatus::Pending,
                'available_at' => now()->addDays(self::HOLD_DAYS),
            ]);

            $this->wallet->creditPending($commission);

            $this->activity->log($confirmedBy, ActivityKind::Sale, 'فروش تایید شد', "کارشناس #{$sale->agent_id}");

            $sale->agent->increment('points', self::POINTS_PER_SALE);
            $this->achievements->evaluateCounters($sale->agent);

            $this->notifications->notify(
                $sale->agent,
                NotificationKind::Commission,
                'فروش تایید شد',
                'پورسانت به کیف پول (معلق) اضافه شد.',
                '/wallet',
            );

            broadcast(new SaleConfirmed($sale->fresh()))->toOthers();

            return $commission;
        });
    }
}
