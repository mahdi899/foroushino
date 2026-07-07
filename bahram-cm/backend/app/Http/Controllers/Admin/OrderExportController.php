<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\Csv;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderExportController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_if($user === null || ! $user->is_admin, 403);

        $rows = Order::query()
            ->with('product')
            ->orderByDesc('created_at')
            ->cursor()
            ->map(fn (Order $order) => [
                $order->order_number,
                $order->product?->title,
                $order->customer_name,
                $order->customer_phone,
                $order->customer_email,
                $order->final_amount,
                $order->status,
                $order->payment_status,
                $order->spotplayer_license_code,
                $order->sms_sent_at?->format('Y-m-d H:i:s'),
                $order->created_at?->format('Y-m-d H:i:s'),
            ]);

        return Csv::download('orders.csv', [
            'شماره سفارش', 'محصول', 'مشتری', 'تلفن', 'ایمیل', 'مبلغ نهایی', 'وضعیت سفارش', 'وضعیت پرداخت', 'کد لایسنس', 'زمان ارسال پیامک', 'تاریخ ثبت',
        ], $rows);
    }
}
