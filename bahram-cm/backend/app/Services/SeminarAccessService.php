<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Collection;

class SeminarAccessService
{
    /**
     * Ensure paid seminar purchases are reflected as seminar attendee rows.
     */
    public function syncFromPaidOrders(User $user): void
    {
        foreach ($this->paidSeminarOrdersForUser($user) as $order) {
            $product = $order->product;
            if (! $product instanceof Product) {
                continue;
            }

            $seminar = Seminar::query()->where('product_id', $product->id)->first();
            if (! $seminar) {
                continue;
            }

            if (! $order->user_id) {
                $order->update(['user_id' => $user->id]);
            }

            SeminarAttendee::query()->firstOrCreate(
                ['seminar_id' => $seminar->id, 'user_id' => $user->id],
                ['attendance_status' => 'registered']
            );
        }
    }

    /** @return Collection<int, Order> */
    public function paidSeminarOrdersForUser(User $user): Collection
    {
        $mobile = Mobile::normalize($user->mobile);

        return Order::query()
            ->with('product.seminar')
            ->whereIn('status', ['paid', 'fulfilled'])
            ->whereNotNull('product_id')
            ->where(function ($query) use ($user, $mobile) {
                $query->where('user_id', $user->id);
                if ($mobile) {
                    $query->orWhere('customer_phone', $mobile);
                }
            })
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->get()
            ->filter(fn (Order $order) => $order->product?->isSeminarProduct() ?? false)
            ->values();
    }
}
