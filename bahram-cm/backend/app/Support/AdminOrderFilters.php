<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class AdminOrderFilters
{
    public static function apply(Builder $query, Request $request): void
    {
        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($paymentStatus = $request->string('payment_status')->toString()) {
            $query->where('payment_status', $paymentStatus);
        }

        if ($productType = $request->string('product_type')->toString()) {
            $query->whereHas('product', fn ($q) => $q->where('type', $productType));
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($productQuery) use ($search) {
                        $productQuery
                            ->where('title', 'like', "%{$search}%")
                            ->orWhere('type', 'like', "%{$search}%");
                    });
            });
        }

        self::applyDateRange($query, $request);
    }

    public static function applyDateRange(Builder $query, Request $request): void
    {
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

        if ($from !== '') {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to !== '') {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($from === '' && $to === '') {
            $days = $request->input('days');
            if ($days !== null && $days !== '' && $days !== 'all') {
                $n = max(1, min(365, (int) $days));
                $query->where('created_at', '>=', now()->subDays($n)->startOfDay());
            }
        }
    }
}
