<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;

/**
 * Campaign / reference-channel course: full list price vs seminar-attendee off.
 */
class SeminarAttendeeCoursePricing
{
    public const COURSE_SLUG = 'campaign-writing';

    public const LIST_PRICE = 26_900_000;

    public const SEMINAR_PRICE = 200_000;

    public function appliesTo(Product $product): bool
    {
        return (string) $product->slug === self::COURSE_SLUG;
    }

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
     * @return array{amount: int, final_amount: int, seminar_off: bool}
     */
    public function quote(Product $product, ?User $user, ?string $rawPhone = null): array
    {
        if (! $this->appliesTo($product)) {
            $amount = (int) $product->price;
            $final = (int) $product->effective_price;

            return [
                'amount' => $amount,
                'final_amount' => $final,
                'seminar_off' => false,
            ];
        }

        $hasSeminar = $this->userHasSeminar($user, $rawPhone);
        // Prefer live product.price so catalog / checkout / Telegram stay aligned.
        $listPrice = (int) $product->price > 0 ? (int) $product->price : self::LIST_PRICE;

        return [
            'amount' => $listPrice,
            'final_amount' => $hasSeminar ? self::SEMINAR_PRICE : $listPrice,
            'seminar_off' => $hasSeminar,
        ];
    }
}
