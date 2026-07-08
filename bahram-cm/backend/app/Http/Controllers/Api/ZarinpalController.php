<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Exceptions\PaymentException;
use App\Services\OrderCompletionTokenService;
use App\Services\PaymentReceiptTokenService;
use App\Services\ZarinpalPaymentService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class ZarinpalController extends Controller
{
    public function __construct(
        private readonly ZarinpalPaymentService $zarinpal,
        private readonly OrderCompletionTokenService $completionTokens,
        private readonly PaymentReceiptTokenService $receiptTokens,
    ) {}

    public function request(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
        ]);

        $order = Order::query()->with('product')->findOrFail($data['order_id']);

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

        if ($status !== 'OK' || blank($authority)) {
            $order = $this->zarinpal->cancelByAuthority($authority);

            return redirect()->away($this->paymentResultUrl('cancelled', $order));
        }

        $result = $this->zarinpal->verify($authority);
        $order = $result['order'];
        $queryStatus = $result['success'] ? 'success' : 'failed';

        if ($result['success'] && $order?->needsProfileCompletion()) {
            $completionToken = $this->completionTokens->issue($order);

            return redirect()->away(
                rtrim((string) config('app.frontend_url'), '/').'/payment/complete?token='.urlencode($completionToken),
            );
        }

        return redirect()->away($this->paymentResultUrl($queryStatus, $order));
    }

    private function paymentResultUrl(string $status, ?Order $order): string
    {
        $order?->loadMissing('product');
        $token = $this->receiptTokens->issue($order, $status);
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        return "{$frontendUrl}/payment/result?token=".urlencode($token);
    }
}
