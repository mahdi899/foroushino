<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Exceptions\PaymentException;
use App\Services\FreeOrderCheckoutService;
use App\Services\OrderCompletionTokenService;
use App\Services\PaymentReceiptTokenService;
use App\Services\ZarinpalPaymentService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class ZarinpalController extends Controller
{
    public function __construct(
        private readonly ZarinpalPaymentService $zarinpal,
        private readonly FreeOrderCheckoutService $freeCheckout,
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

        if ($this->freeCheckout->isFree($order)) {
            $result = $this->freeCheckout->complete($order);

            return ApiResponse::success([
                'payment_url' => $result['payment_url'],
                'authority' => null,
                'order_number' => $result['order_number'],
            ]);
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

        // Bare URL hits (no Authority) are not real gateway returns — don't mint a receipt token.
        if (blank($authority)) {
            return redirect()->away(
                rtrim((string) config('app.frontend_url'), '/').'/payment/result',
            );
        }

        if ($status !== 'OK') {
            $order = $this->zarinpal->cancelByAuthority($authority);

            return redirect()->away($this->paymentResultUrl('cancelled', $order));
        }

        $result = $this->zarinpal->verify($authority);
        $order = $result['order'];

        // Network blip while order is still pending — never mint a false "failed" receipt.
        if (! empty($result['pending_verify']) && $order && ! $order->isPaid()) {
            return redirect()->away($this->paymentResultUrl('pending', $order, $authority));
        }

        $queryStatus = $result['success'] ? 'success' : 'failed';

        // Telegram (and other linked) checkouts already carry phone + identity on the user —
        // don't bounce them to /payment/complete when fulfillment already ran.
        if ($result['success'] && $order?->needsProfileCompletion() && $this->shouldCollectProfile($order)) {
            $completionToken = $this->completionTokens->issue($order);

            return redirect()->away(
                rtrim((string) config('app.frontend_url'), '/').'/payment/complete?token='.urlencode($completionToken),
            );
        }

        return redirect()->away($this->paymentResultUrl($queryStatus, $order));
    }

    private function shouldCollectProfile(?Order $order): bool
    {
        if ($order === null) {
            return false;
        }

        // Linked account with a real mobile already verified in Telegram/site login —
        // fulfillment + bot notify don't need the guest name form.
        if ($order->user_id && filled($order->customer_phone)) {
            return false;
        }

        return true;
    }

    private function paymentResultUrl(string $status, ?Order $order, ?string $authority = null): string
    {
        $order?->loadMissing('product');
        $token = $this->receiptTokens->issue($order, $status);
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $url = "{$frontendUrl}/payment/result?token=".urlencode($token);
        if ($authority !== null && $authority !== '') {
            $url .= '&authority='.urlencode($authority);
        }

        return $url;
    }
}
