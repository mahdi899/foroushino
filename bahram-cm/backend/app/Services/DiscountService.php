<?php

namespace App\Services;

use App\Enums\DiscountRestriction;
use App\Enums\DiscountType;
use App\Models\DiscountCode;
use App\Models\DiscountCodeUsage;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DiscountService
{
    public function findActiveByCode(string $code): ?DiscountCode
    {
        $normalized = $this->normalizeCode($code);
        if ($normalized === '') {
            return null;
        }

        return DiscountCode::query()
            ->whereRaw('UPPER(code) = ?', [$normalized])
            ->first();
    }

    /**
     * @return array{discount_code: DiscountCode, coupon_discount: int, final_amount: int, subtotal: int}
     */
    public function preview(
        string $code,
        Product $product,
        ?User $user,
        ?string $phone,
        bool $viaLink,
    ): array {
        $discountCode = $this->resolveEligibleCode($code, $product, $user, $phone, $viaLink);
        $subtotal = (int) $product->effective_price;
        $couponDiscount = $this->calculateDiscountAmount($discountCode, $subtotal);
        $finalAmount = max($subtotal - $couponDiscount, 0);

        return [
            'discount_code' => $discountCode,
            'coupon_discount' => $couponDiscount,
            'final_amount' => $finalAmount,
            'subtotal' => $subtotal,
        ];
    }

    public function resolveEligibleCode(
        string $code,
        Product $product,
        ?User $user,
        ?string $phone,
        bool $viaLink,
    ): DiscountCode {
        $discountCode = $this->findActiveByCode($code);

        if (! $discountCode) {
            throw ValidationException::withMessages([
                'coupon' => 'کد تخفیف معتبر نیست.',
            ]);
        }

        $this->assertEligible($discountCode, $product, $user, $phone, $viaLink);

        return $discountCode;
    }

    public function calculateDiscountAmount(DiscountCode $discountCode, int $subtotal): int
    {
        if ($subtotal <= 0) {
            return 0;
        }

        $amount = match ($discountCode->discount_type) {
            DiscountType::Percent => (int) round($subtotal * min($discountCode->discount_value, 100) / 100),
            DiscountType::Fixed => min($discountCode->discount_value, $subtotal),
        };

        if ($discountCode->max_discount_amount !== null) {
            $amount = min($amount, (int) $discountCode->max_discount_amount);
        }

        return max(min($amount, $subtotal), 0);
    }

    public function recordUsage(Order $order): void
    {
        if (! $order->discount_code_id || (int) $order->coupon_discount_amount <= 0) {
            return;
        }

        DB::transaction(function () use ($order) {
            $usage = DiscountCodeUsage::query()->firstOrCreate(
                ['order_id' => $order->id],
                [
                    'discount_code_id' => $order->discount_code_id,
                    'user_id' => $order->user_id,
                    'discount_amount' => (int) $order->coupon_discount_amount,
                ],
            );

            if ($usage->wasRecentlyCreated) {
                DiscountCode::query()
                    ->whereKey($order->discount_code_id)
                    ->increment('uses_count');
            }
        });
    }

    private function assertEligible(
        DiscountCode $discountCode,
        Product $product,
        ?User $user,
        ?string $phone,
        bool $viaLink,
    ): void {
        if (! $discountCode->is_active) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف غیرفعال است.',
            ]);
        }

        if ($discountCode->starts_at && now()->lt($discountCode->starts_at)) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف هنوز فعال نشده است.',
            ]);
        }

        if ($discountCode->ends_at && now()->gt($discountCode->ends_at)) {
            throw ValidationException::withMessages([
                'coupon' => 'مهلت استفاده از این کد تخفیف به پایان رسیده است.',
            ]);
        }

        if ($discountCode->requires_link && ! $viaLink) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف فقط از طریق لینک اختصاصی قابل استفاده است.',
            ]);
        }

        $subtotal = (int) $product->effective_price;

        if ($discountCode->min_order_amount !== null && $subtotal < (int) $discountCode->min_order_amount) {
            throw ValidationException::withMessages([
                'coupon' => 'حداقل مبلغ خرید برای این کد تخفیف رعایت نشده است.',
            ]);
        }

        $this->assertUsageLimits($discountCode, $user, $phone);
        $this->assertRestriction($discountCode, $product, $user, $phone);
    }

    private function assertUsageLimits(DiscountCode $discountCode, ?User $user, ?string $phone): void
    {
        if ($discountCode->max_uses !== null) {
            $reserved = $this->reservedUsageCount($discountCode->id);
            if ($reserved >= (int) $discountCode->max_uses) {
                throw ValidationException::withMessages([
                    'coupon' => 'ظرفیت استفاده از این کد تخفیف تکمیل شده است.',
                ]);
            }
        }

        if ($discountCode->max_uses_per_user === null) {
            return;
        }

        $userId = $user?->id ?? $this->resolveUserIdFromPhone($phone);
        if (! $userId) {
            return;
        }

        $userUses = $this->reservedUsageCountForUser($discountCode->id, $userId);
        if ($userUses >= (int) $discountCode->max_uses_per_user) {
            throw ValidationException::withMessages([
                'coupon' => 'شما قبلاً از این کد تخفیف استفاده کرده‌اید.',
            ]);
        }
    }

    private function assertRestriction(
        DiscountCode $discountCode,
        Product $product,
        ?User $user,
        ?string $phone,
    ): void {
        match ($discountCode->restriction) {
            DiscountRestriction::All => null,
            DiscountRestriction::SpecificProducts => $this->assertSpecificProducts($discountCode, $product),
            DiscountRestriction::SpecificUsers => $this->assertSpecificUsers($discountCode, $user, $phone),
            DiscountRestriction::PriorBuyers => $this->assertPriorBuyers($discountCode, $user, $phone),
        };

        // Combined constraints (bot/site wizards may attach both pivots).
        $discountCode->loadMissing(['users', 'products']);

        if (
            $discountCode->restriction !== DiscountRestriction::SpecificUsers
            && $discountCode->users->isNotEmpty()
        ) {
            $this->assertSpecificUsers($discountCode, $user, $phone);
        }

        if (
            ! in_array($discountCode->restriction, [
                DiscountRestriction::SpecificProducts,
                DiscountRestriction::PriorBuyers,
            ], true)
            && $discountCode->products->isNotEmpty()
        ) {
            $this->assertSpecificProducts($discountCode, $product);
        }
    }

    private function assertSpecificProducts(DiscountCode $discountCode, Product $product): void
    {
        $discountCode->loadMissing('products');
        $allowed = $discountCode->products->pluck('id');

        if ($allowed->isEmpty() || ! $allowed->contains($product->id)) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف برای این محصول قابل استفاده نیست.',
            ]);
        }
    }

    private function assertSpecificUsers(DiscountCode $discountCode, ?User $user, ?string $phone): void
    {
        $discountCode->loadMissing('users');
        $allowed = $discountCode->users->pluck('id');

        if ($allowed->isEmpty()) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف برای حساب شما فعال نیست.',
            ]);
        }

        $userId = $user?->id ?? $this->resolveUserIdFromPhone($phone);
        if (! $userId || ! $allowed->contains($userId)) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف برای حساب شما فعال نیست.',
            ]);
        }
    }

    private function assertPriorBuyers(DiscountCode $discountCode, ?User $user, ?string $phone): void
    {
        $userId = $user?->id ?? $this->resolveUserIdFromPhone($phone);

        if (! $userId) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف فقط برای خریداران قبلی فعال است.',
            ]);
        }

        $discountCode->loadMissing('products');
        $query = Order::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['paid', 'fulfilled']);

        if ($discountCode->products->isNotEmpty()) {
            $query->whereIn('product_id', $discountCode->products->pluck('id'));
        }

        if (! $query->exists()) {
            throw ValidationException::withMessages([
                'coupon' => 'این کد تخفیف فقط برای خریداران قبلی فعال است.',
            ]);
        }
    }

    private function reservedUsageCount(int $discountCodeId): int
    {
        $paidUses = DiscountCodeUsage::query()
            ->where('discount_code_id', $discountCodeId)
            ->count();

        $pendingUses = Order::query()
            ->where('discount_code_id', $discountCodeId)
            ->where('status', 'pending_payment')
            ->count();

        return $paidUses + $pendingUses;
    }

    private function reservedUsageCountForUser(int $discountCodeId, int $userId): int
    {
        $paidUses = DiscountCodeUsage::query()
            ->where('discount_code_id', $discountCodeId)
            ->where('user_id', $userId)
            ->count();

        $pendingUses = Order::query()
            ->where('discount_code_id', $discountCodeId)
            ->where('user_id', $userId)
            ->where('status', 'pending_payment')
            ->count();

        return $paidUses + $pendingUses;
    }

    private function resolveUserIdFromPhone(?string $phone): ?int
    {
        $mobile = Mobile::normalize((string) $phone);
        if (! $mobile) {
            return null;
        }

        $user = User::query()->where('mobile', $mobile)->first();

        return $user && ! $user->is_admin ? $user->id : null;
    }

    private function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }
}
