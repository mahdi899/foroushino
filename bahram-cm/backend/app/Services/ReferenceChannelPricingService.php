<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;

/**
 * Reference-channel pricing: list price minus the max seminar discount (not sum).
 */
class ReferenceChannelPricingService
{
    /**
     * @return array{amount: int, final_amount: int, seminar_discount: int, seminar_off: bool}
     */
    public function quoteForProduct(Product $product, ?User $user, ?string $rawPhone = null): array
    {
        if (! $product->isReferenceChannelProduct()) {
            $amount = (int) $product->price;
            $final = (int) $product->effective_price;

            return [
                'amount' => $amount,
                'final_amount' => $final,
                'seminar_discount' => max($amount - $final, 0),
                'seminar_off' => false,
            ];
        }

        $channel = $product->relationLoaded('referenceChannel')
            ? $product->referenceChannel
            : ReferenceChannel::query()->where('product_id', $product->id)->first();

        if ($channel === null) {
            $amount = (int) $product->price;

            return [
                'amount' => $amount,
                'final_amount' => $amount,
                'seminar_discount' => 0,
                'seminar_off' => false,
            ];
        }

        return $this->quote($channel, $user, $rawPhone);
    }

    /**
     * @return array{amount: int, final_amount: int, seminar_discount: int, seminar_off: bool}
     */
    public function quote(ReferenceChannel $channel, ?User $user, ?string $rawPhone = null): array
    {
        $amount = (int) $channel->price;
        $discount = $this->maxSeminarDiscount($user, $rawPhone);
        $final = max(0, $amount - $discount);

        return [
            'amount' => $amount,
            'final_amount' => $final,
            'seminar_discount' => $discount,
            'seminar_off' => $discount > 0,
        ];
    }

    public function maxSeminarDiscount(?User $user, ?string $rawPhone = null): int
    {
        $userIds = $this->resolveUserIds($user, $rawPhone);
        if ($userIds === []) {
            return 0;
        }

        $fromAttendance = (int) SeminarAttendee::query()
            ->whereIn('user_id', $userIds)
            ->where('attendance_status', '!=', 'absent')
            ->join('seminars', 'seminars.id', '=', 'seminar_attendees.seminar_id')
            ->max('seminars.reference_discount_amount');

        $seminarProductIds = Seminar::query()
            ->whereNotNull('product_id')
            ->where('reference_discount_amount', '>', 0)
            ->pluck('product_id', 'id');

        $fromOwnership = 0;
        if ($seminarProductIds->isNotEmpty()) {
            $guard = app(PurchaseGuardService::class);
            $phone = Mobile::normalize((string) ($rawPhone ?? $user?->mobile ?? ''));

            foreach (Seminar::query()->whereIn('id', $seminarProductIds->keys())->get() as $seminar) {
                $product = Product::query()->find($seminar->product_id);
                if ($product === null) {
                    continue;
                }
                if ($guard->ownsProduct($user, (string) ($phone ?? ''), $product)) {
                    $fromOwnership = max($fromOwnership, (int) $seminar->reference_discount_amount);
                }
            }
        }

        return max(0, $fromAttendance, $fromOwnership);
    }

    /**
     * @return list<int>
     */
    private function resolveUserIds(?User $user, ?string $rawPhone): array
    {
        $phone = Mobile::normalize((string) ($rawPhone ?? $user?->mobile ?? ''));

        return array_values(array_filter(array_unique([
            $user && ! $user->is_admin ? $user->id : null,
            $phone ? User::query()->where('mobile', $phone)->value('id') : null,
        ])));
    }
}
