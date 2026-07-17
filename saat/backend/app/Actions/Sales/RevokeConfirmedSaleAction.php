<?php

namespace App\Actions\Sales;

use App\Enums\LeadStatus;
use App\Enums\NotificationKind;
use App\Enums\SaleStatus;
use App\Models\LeadStatusHistory;
use App\Models\Sale;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Rejects a previously confirmed sale, reverses any credited commission, and may
 * drive the agent wallet negative until the debt is settled.
 */
class RevokeConfirmedSaleAction
{
    private const POINTS_PER_SALE = 50;

    public function __construct(
        private readonly WalletService $wallet,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @return array{sale: Sale, commission: ?\App\Models\Commission, wallet: ?\App\Models\Wallet}
     */
    public function execute(Sale $sale, User $revokedBy, string $reason): array
    {
        if ($sale->status !== SaleStatus::Confirmed) {
            throw new RuntimeException('فقط فروش‌های تاییدشده قابل رد هستند.');
        }

        return DB::transaction(function () use ($sale, $revokedBy, $reason) {
            $sale->loadMissing(['commission', 'agent', 'lead']);

            $commission = $sale->commission;
            $wallet = null;

            if ($commission) {
                $wallet = $this->wallet->reverseCommission($commission, $reason);
                $commission = $commission->fresh();
            }

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
                'by_user_id' => $revokedBy->id,
                'note' => 'فروش تاییدشده رد شد: '.$reason,
            ]);

            $agent = $sale->agent;
            $agent->update(['points' => max(0, (int) $agent->points - self::POINTS_PER_SALE)]);

            $body = $reason;
            if ($wallet && (float) $wallet->balance_available < 0) {
                $body .= ' — موجودی کیف پول منفی شده و تا تسویه بدهی امکان برداشت ندارید.';
            }

            $this->notifications->notify(
                $agent,
                NotificationKind::Sale,
                'فروش تاییدشده رد شد',
                $body,
                '/wallet',
            );

            return [
                'sale' => $sale->fresh(['lead', 'product', 'agent']),
                'commission' => $commission,
                'wallet' => $wallet,
            ];
        });
    }
}
