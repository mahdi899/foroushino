<?php

namespace App\Services;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Enums\SpotplayerLicenseStatus;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Collection;

class CourseAccessService
{
    /**
     * Ensure every paid/fulfilled order is reflected as an active course access row.
     * Older orders may have been marked paid before fulfillment ran.
     */
    public function syncFromPaidOrders(User $user): void
    {
        $mobile = Mobile::normalize($user->mobile);

        $orders = Order::query()
            ->with('product')
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
            ->get();

        foreach ($orders as $order) {
            if (! $order->product_id) {
                continue;
            }

            $product = $order->product;
            if ($product instanceof Product && $product->isSeminarProduct()) {
                continue;
            }

            if (! $order->user_id) {
                $order->update(['user_id' => $user->id]);
            }

            $this->ensureAccessForProduct($user, $order->product_id, $order);
        }

        $licenses = SpotplayerLicense::query()
            ->with('order')
            ->whereNotNull('product_id')
            ->where(function ($query) use ($user, $mobile) {
                $query->where('user_id', $user->id);
                if ($mobile) {
                    $query->orWhereHas('order', fn ($order) => $order->where('customer_phone', $mobile));
                }
            })
            ->get();

        foreach ($licenses as $license) {
            if (! $license->user_id) {
                $license->update(['user_id' => $user->id]);
            }

            $product = $license->product;
            if ($product instanceof Product && $product->isSeminarProduct()) {
                continue;
            }

            $this->ensureAccessForProduct($user, (int) $license->product_id, $license->order);
        }
    }

    private function ensureAccessForProduct(User $user, int $productId, ?Order $order): void
    {
        $product = $order?->product ?? Product::query()->find($productId);
        if ($product instanceof Product && $product->isSeminarProduct()) {
            return;
        }

        $access = CourseAccess::query()->firstOrCreate(
            ['user_id' => $user->id, 'product_id' => $productId],
            [
                'order_id' => $order?->id,
                'status' => CourseAccessStatus::Active,
                'access_type' => 'lifetime',
                'source' => CourseAccessSource::Zarinpal,
                'activated_at' => $order?->paid_at ?? now(),
            ]
        );

        if ($access->status !== CourseAccessStatus::Active) {
            $access->update([
                'status' => CourseAccessStatus::Active,
                'activated_at' => $access->activated_at ?? $order?->paid_at ?? now(),
                'deactivated_at' => null,
            ]);
        }

        if ($order && ! $access->order_id) {
            $access->update(['order_id' => $order->id]);
        }
    }

    /** @return Collection<int, Order> */
    public function paidOrdersForUser(User $user): Collection
    {
        $mobile = Mobile::normalize($user->mobile);

        return Order::query()
            ->with(['product', 'spotplayerLicense'])
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
            ->filter(function (Order $order) {
                $product = $order->product;

                return ! ($product instanceof Product && $product->isSeminarProduct());
            })
            ->values();
    }

  public function resolveLicense(User $user, Product $product, ?CourseAccess $access = null, ?Order $order = null): ?SpotplayerLicense
    {
        if ($access?->relationLoaded('spotplayerLicense') && $access->spotplayerLicense) {
            return $access->spotplayerLicense;
        }

        if ($access && ! $access->relationLoaded('spotplayerLicense')) {
            $linked = $access->spotplayerLicense()->first();
            if ($linked) {
                return $linked;
            }
        }

        if ($order?->relationLoaded('spotplayerLicense') && $order->spotplayerLicense) {
            return $order->spotplayerLicense;
        }

        if ($order && ! $order->relationLoaded('spotplayerLicense')) {
            $linked = $order->spotplayerLicense()->first();
            if ($linked) {
                return $linked;
            }
        }

        return SpotplayerLicense::query()
            ->where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->where('status', SpotplayerLicenseStatus::Active)
            ->whereNotNull('license_key')
            ->orderByDesc('id')
            ->first()
            ?? SpotplayerLicense::query()
                ->where('product_id', $product->id)
                ->where('status', SpotplayerLicenseStatus::Active)
                ->whereNotNull('license_key')
                ->when($order?->customer_phone, function ($query, $phone) {
                    $query->whereHas('order', fn ($order) => $order->where('customer_phone', $phone));
                })
                ->orderByDesc('id')
                ->first();
    }

    /**
     * @return list<int>
     */
    public function purchasedProductIds(User $user, Collection $paidOrders, Collection $accesses): array
    {
        $mobile = Mobile::normalize($user->mobile);

        $licensedProductIds = SpotplayerLicense::query()
            ->whereNotNull('product_id')
            ->where(function ($query) use ($user, $mobile) {
                $query->where('user_id', $user->id);
                if ($mobile) {
                    $query->orWhereHas('order', fn ($order) => $order->where('customer_phone', $mobile));
                }
            })
            ->pluck('product_id');

        $ordered = [];

        foreach ($paidOrders as $order) {
            if ($order->product_id && ! in_array($order->product_id, $ordered, true)) {
                $ordered[] = (int) $order->product_id;
            }
        }

        foreach ($accesses as $access) {
            $id = (int) $access->product_id;
            if (! in_array($id, $ordered, true)) {
                $ordered[] = $id;
            }
        }

        foreach ($licensedProductIds as $productId) {
            $id = (int) $productId;
            if (! in_array($id, $ordered, true)) {
                $ordered[] = $id;
            }
        }

        return $ordered;
    }
}
