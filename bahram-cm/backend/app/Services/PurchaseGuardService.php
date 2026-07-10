<?php

namespace App\Services;

use App\Enums\CourseAccessStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Validation\ValidationException;

class PurchaseGuardService
{
    public function ownsProduct(?User $user, string $rawPhone, Product $product): bool
    {
        $phone = Mobile::normalize($rawPhone);
        $userId = $user && ! $user->is_admin ? $user->id : null;

        if ($this->hasPaidOrder($product->id, $userId, $phone)) {
            return true;
        }

        if ($userId && CourseAccess::query()
            ->where('user_id', $userId)
            ->where('product_id', $product->id)
            ->where('status', CourseAccessStatus::Active)
            ->exists()) {
            return true;
        }

        return $this->isRegisteredSeminarAttendee($product, $userId, $phone);
    }

    /**
     * @throws ValidationException
     */
    public function assertCanPurchase(?User $user, string $rawPhone, Product $product): void
    {
        if ($this->ownsProduct($user, $rawPhone, $product)) {
            throw ValidationException::withMessages([
                'product_id' => 'شما قبلاً این محصول را خریداری کرده‌اید.',
            ]);
        }
    }

    private function hasPaidOrder(int $productId, ?int $userId, ?string $phone): bool
    {
        return Order::query()
            ->where('product_id', $productId)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->where(function ($query) use ($userId, $phone) {
                if ($userId && $phone) {
                    $query->where('user_id', $userId)->orWhere('customer_phone', $phone);

                    return;
                }

                if ($userId) {
                    $query->where('user_id', $userId);

                    return;
                }

                if ($phone) {
                    $query->where('customer_phone', $phone);

                    return;
                }

                $query->whereRaw('0 = 1');
            })
            ->exists();
    }

    private function isRegisteredSeminarAttendee(Product $product, ?int $userId, ?string $phone): bool
    {
        $seminar = Seminar::query()->where('product_id', $product->id)->first();
        if (! $seminar) {
            return false;
        }

        $userIds = array_values(array_filter(array_unique([
            $userId,
            $phone ? User::query()->where('mobile', $phone)->value('id') : null,
        ])));

        if ($userIds === []) {
            return false;
        }

        return SeminarAttendee::query()
            ->where('seminar_id', $seminar->id)
            ->whereIn('user_id', $userIds)
            ->where('attendance_status', '!=', 'absent')
            ->exists();
    }
}
