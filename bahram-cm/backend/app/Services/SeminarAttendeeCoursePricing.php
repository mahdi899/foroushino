<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;

/**
 * Seminar attendance helpers (reference-channel pricing lives in ReferenceChannelPricingService).
 */
class SeminarAttendeeCoursePricing
{
    public function userHasSeminar(?User $user, ?string $rawPhone = null): bool
    {
        $phone = Mobile::normalize((string) ($rawPhone ?? $user?->mobile ?? ''));
        $userIds = array_values(array_filter(array_unique([
            $user && ! $user->is_admin ? $user->id : null,
            $phone ? User::query()->where('mobile', $phone)->value('id') : null,
        ])));

        if ($userIds === []) {
            return false;
        }

        if (SeminarAttendee::query()
            ->whereIn('user_id', $userIds)
            ->where('attendance_status', '!=', 'absent')
            ->exists()) {
            return true;
        }

        $seminarProductIds = Seminar::query()
            ->whereNotNull('product_id')
            ->pluck('product_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($seminarProductIds === []) {
            return false;
        }

        $guard = app(PurchaseGuardService::class);
        foreach ($seminarProductIds as $productId) {
            $product = Product::query()->find($productId);
            if ($product === null) {
                continue;
            }
            if ($guard->ownsProduct($user, (string) ($phone ?? ''), $product)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Standard product list/sale price — no seminar-attendee override (that is reference-channel only).
     *
     * @return array{amount: int, final_amount: int, seminar_off: bool}
     */
    public function quote(Product $product, ?User $user, ?string $rawPhone = null): array
    {
        $amount = (int) $product->price;
        $final = (int) $product->effective_price;

        return [
            'amount' => $amount,
            'final_amount' => $final,
            'seminar_off' => false,
        ];
    }
}
