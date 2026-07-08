<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\Csv;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderExportController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_if($user === null || ! $user->is_admin, 403);

        $query = Order::query()->with('product')->orderByDesc('created_at');
        $this->applyFilters($query, $request);

        $rows = $query->cursor()->map(fn (Order $order) => [
            $order->order_number,
            $order->product?->title,
            $this->productTypeLabel($order->product?->type),
            $order->customer_name,
            $order->customer_phone,
            $order->customer_email,
            $order->final_amount,
            $order->status,
            $order->payment_status,
            $order->spotplayer_license_code,
            $order->sms_sent_at?->format('Y-m-d H:i:s'),
            $order->paid_at?->format('Y-m-d H:i:s'),
            $order->created_at?->format('Y-m-d H:i:s'),
        ]);

        return Csv::download('orders-export.csv', [
            'شماره سفارش',
            'محصول',
            'نوع محصول',
            'مشتری',
            'تلفن',
            'ایمیل',
            'مبلغ نهایی (تومان)',
            'وضعیت سفارش',
            'وضعیت پرداخت',
            'کد لایسنس',
            'زمان ارسال پیامک',
            'زمان پرداخت',
            'تاریخ ثبت',
        ], $rows);
    }

    private function applyFilters(Builder $query, Request $request): void
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
    }

    private function productTypeLabel(?string $type): ?string
    {
        return match ($type) {
            'package' => 'پکیج',
            'normal' => 'عادی',
            'course_spotplayer' => 'دوره SpotPlayer',
            'manual_service' => 'خدمت دستی',
            'event' => 'رویداد',
            default => $type,
        };
    }
}
