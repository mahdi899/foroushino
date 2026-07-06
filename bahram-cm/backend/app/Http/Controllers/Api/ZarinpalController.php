<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Exceptions\PaymentException;
use App\Services\ZarinpalPaymentService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class ZarinpalController extends Controller
{
    public function __construct(private readonly ZarinpalPaymentService $zarinpal) {}

    public function request(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
        ]);

        $order = Order::query()->findOrFail($data['order_id']);

        if ($order->isPaid()) {
            return ApiResponse::error('order_already_paid', 'این سفارش قبلاً پرداخت شده است.', 422);
        }

        try {
            $payment = $this->zarinpal->request($order);
        } catch (PaymentException $e) {
            return ApiResponse::error('payment_gateway_error', $e->getMessage(), 502);
        }

        return ApiResponse::success([
            'payment_url' => $this->zarinpal->getPaymentUrl($payment),
            'authority' => $payment->authority,
        ]);
    }

    public function callback(Request $request)
    {
        $authority = (string) $request->query('Authority', '');
        $status = (string) $request->query('Status', '');

        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        if ($status !== 'OK' || blank($authority)) {
            return redirect()->away("{$frontendUrl}/payment/result?status=cancelled");
        }

        $result = $this->zarinpal->verify($authority);

        $orderNumber = $result['order']?->order_number;
        $queryStatus = $result['success'] ? 'success' : 'failed';

        return redirect()->away("{$frontendUrl}/payment/result?status={$queryStatus}&order={$orderNumber}");
    }
}
