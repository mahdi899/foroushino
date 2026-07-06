<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendSmsJob;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with('product')->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($paymentStatus = $request->string('payment_status')->toString()) {
            $query->where('payment_status', $paymentStatus);
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $orders = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $orders->getCollection()->map(fn (Order $o) => $this->payload($o)),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['product', 'payments']);

        return response()->json(['data' => $this->payload($order, true)]);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['pending_payment', 'paid', 'fulfilled', 'failed', 'cancelled'])],
            'payment_status' => ['sometimes', 'string', Rule::in(['pending', 'paid', 'failed'])],
        ]);

        $order->update($data);
        $order->load(['product', 'payments']);

        return response()->json(['data' => $this->payload($order, true)]);
    }

    public function resendSms(Order $order): JsonResponse
    {
        if (! $order->isPaid()) {
            return response()->json(['message' => 'فقط سفارش‌های پرداخت‌شده قابل ارسال مجدد پیامک هستند.'], 422);
        }

        SendSmsJob::dispatch($order->id);

        return response()->json(['ok' => true, 'message' => 'درخواست ارسال مجدد پیامک ثبت شد.']);
    }

    /** @return array<string, mixed> */
    private function payload(Order $order, bool $detailed = false): array
    {
        $latestPayment = $detailed ? $order->payments->sortByDesc('id')->first() : null;

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'product_id' => $order->product_id,
            'product_title' => $order->product?->title,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'customer_email' => $order->customer_email,
            'customer_national_code' => $order->customer_national_code,
            'amount' => $order->amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'spotplayer_license_code' => $order->spotplayer_license_code,
            'sms_sent_at' => $order->sms_sent_at?->toIso8601String(),
            'paid_at' => $order->paid_at?->toIso8601String(),
            'created_at' => $order->created_at?->toIso8601String(),
            'payment_ref_id' => $latestPayment?->ref_id,
        ];
    }
}
