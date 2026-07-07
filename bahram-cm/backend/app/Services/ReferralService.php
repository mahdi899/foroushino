<?php

namespace App\Services;

use App\Enums\ReferralConversionStatus;
use App\Models\CashbackPayout;
use App\Models\Order;
use App\Models\ReferralCode;
use App\Models\ReferralConversion;
use App\Models\Setting;
use App\Models\User;

/**
 * Referral code issuance and cashback bookkeeping. The cashback amount is
 * configurable via `settings` (group "referral") so it is never hardcoded.
 */
class ReferralService
{
    private const DEFAULT_CASHBACK_AMOUNT = 2_000_000;

    public function getOrCreateCode(User $user): ReferralCode
    {
        return $user->referralCode ?? ReferralCode::create([
            'user_id' => $user->id,
            'code' => ReferralCode::generateUniqueCode(),
        ]);
    }

    public function cashbackAmount(): int
    {
        $setting = Setting::query()->where('group', 'referral')->where('key', 'cashback_amount')->first();

        if (! $setting) {
            $setting = Setting::create([
                'group' => 'referral',
                'key' => 'cashback_amount',
                'value' => ['amount' => self::DEFAULT_CASHBACK_AMOUNT],
            ]);
        }

        return (int) ($setting->value['amount'] ?? self::DEFAULT_CASHBACK_AMOUNT);
    }

    /**
     * Creates a referral conversion for a paid order, if (and only if) a
     * valid, active, non-self referral code was captured for it and no
     * conversion already exists for this order.
     */
    public function createConversionIfEligible(Order $order, ?string $refCode): void
    {
        if (blank($refCode) || blank($order->user_id)) {
            return;
        }

        $referralCode = ReferralCode::query()->where('code', $refCode)->where('is_active', true)->first();

        if (! $referralCode) {
            return;
        }

        if ((int) $referralCode->user_id === (int) $order->user_id) {
            return; // self-referral is not allowed
        }

        if (ReferralConversion::query()->where('order_id', $order->id)->exists()) {
            return; // one conversion per order, at most
        }

        ReferralConversion::create([
            'referrer_user_id' => $referralCode->user_id,
            'buyer_user_id' => $order->user_id,
            'order_id' => $order->id,
            'status' => ReferralConversionStatus::Pending,
            'cashback_amount' => $this->cashbackAmount(),
            'converted_at' => now(),
        ]);
    }

    /** @return array{successful_purchases: int, payable_amount: int, paid_amount: int, pending_amount: int} */
    public function summary(User $user): array
    {
        $approvedTotal = (int) ReferralConversion::query()
            ->where('referrer_user_id', $user->id)
            ->where('status', ReferralConversionStatus::Approved)
            ->sum('cashback_amount');

        $pendingConversions = (int) ReferralConversion::query()
            ->where('referrer_user_id', $user->id)
            ->where('status', ReferralConversionStatus::Pending)
            ->sum('cashback_amount');

        $paidOut = (int) CashbackPayout::query()
            ->where('user_id', $user->id)
            ->where('status', 'paid')
            ->sum('amount');

        $inFlightPayouts = (int) CashbackPayout::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->sum('amount');

        $payable = max(0, $approvedTotal - $paidOut - $inFlightPayouts);

        $successfulPurchases = ReferralConversion::query()
            ->where('referrer_user_id', $user->id)
            ->where('status', '!=', ReferralConversionStatus::Rejected)
            ->count();

        return [
            'successful_purchases' => $successfulPurchases,
            'payable_amount' => $payable,
            'paid_amount' => $paidOut,
            'pending_amount' => $pendingConversions + $inFlightPayouts,
        ];
    }
}
