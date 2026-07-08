<?php

namespace App\Services;

use App\Enums\ReferralConversionStatus;
use App\Models\CashbackPayout;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReferralCode;
use App\Models\ReferralConversion;
use App\Models\User;

/**
 * Referral code issuance and cashback bookkeeping. Cashback amount is defined
 * per product (percent of order total or fixed Toman).
 */
class ReferralService
{
    public function getOrCreateCode(User $user): ReferralCode
    {
        return $user->referralCode ?? ReferralCode::create([
            'user_id' => $user->id,
            'code' => ReferralCode::generateUniqueCode(),
        ]);
    }

    public function cashbackAmountForOrder(Order $order): int
    {
        $order->loadMissing('product');
        $product = $order->product;

        if (! $product instanceof Product) {
            return 0;
        }

        return $product->computeReferralCashback((int) $order->final_amount);
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

        $cashbackAmount = $this->cashbackAmountForOrder($order);

        if ($cashbackAmount <= 0) {
            return;
        }

        ReferralConversion::create([
            'referrer_user_id' => $referralCode->user_id,
            'buyer_user_id' => $order->user_id,
            'order_id' => $order->id,
            'status' => ReferralConversionStatus::Pending,
            'cashback_amount' => $cashbackAmount,
            'converted_at' => now(),
        ]);
    }

    /** @return array<int, array{title: string, slug: string, type: string, value: int, label: string}> */
    public function activeCashbackProducts(): array
    {
        return Product::query()
            ->where('is_active', true)
            ->where('referral_cashback_enabled', true)
            ->orderBy('title')
            ->get()
            ->map(fn (Product $product) => [
                'title' => $product->title,
                'slug' => $product->slug,
                'type' => (string) $product->referral_cashback_type,
                'value' => (int) $product->referral_cashback_value,
                'label' => $this->formatCashbackLabel($product),
            ])
            ->values()
            ->all();
    }

    public function formatCashbackLabel(Product $product): string
    {
        if (! $product->referral_cashback_enabled) {
            return '';
        }

        $value = (int) ($product->referral_cashback_value ?? 0);

        if ($product->referral_cashback_type === 'percent' && $value > 0) {
            return "{$value}٪ از مبلغ خرید";
        }

        if ($product->referral_cashback_type === 'fixed' && $value > 0) {
            return number_format($value).' تومان';
        }

        return '';
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
