<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()
            ->with([
                'product',
                'payments' => fn ($q) => $q->orderByDesc('id'),
            ])
            ->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 20));

        return ApiResponse::success(
            $orders->getCollection()->map(fn (Order $order) => $this->studentPayload($order)),
            200,
            [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ]
        );
    }

    /** @return array<string, mixed> */
    private function studentPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'amount' => $order->amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'customer_email' => $order->customer_email,
            'customer_national_code' => $order->customer_national_code,
            'customer_extra_data' => $order->customer_extra_data,
            'referral_code' => $order->referral_code,
            'product_title' => $order->product?->title,
            'product_type' => $order->product?->type?->value ?? $order->product?->type,
            'product_slug' => $order->product?->slug,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'created_at' => $order->created_at?->toIso8601String(),
            'payments' => $order->payments->map(fn (Payment $payment) => $this->paymentPayload($payment))->values()->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function paymentPayload(Payment $payment): array
    {
        $isSandbox = str_starts_with((string) $payment->authority, 'DEV-')
            || data_get($payment->verify_payload, 'dev_mode')
            || data_get($payment->request_payload, 'dev_mode');

        return [
            'gateway_label' => $payment->gateway === 'zarinpal' ? 'زرین‌پال' : $payment->gateway,
            'mode_label' => $isSandbox ? 'تست / سندباکس' : 'واقعی',
            'ref_id' => $payment->ref_id,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'card_pan' => data_get($payment->verify_payload, 'data.card_pan'),
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'created_at' => $payment->created_at?->toIso8601String(),
        ];
    }
}
