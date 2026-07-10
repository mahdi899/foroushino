<?php

namespace App\Services;

use App\Jobs\FulfillOrderJob;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentSetting;
use App\Services\AdminTelegramLogService;
use App\Services\Exceptions\PaymentException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Adapter for the Zarinpal payment gateway (REST API v4). Handles both
 * request (redirect to gateway) and verify (callback) steps, and keeps a
 * Payment record in sync with each attempt.
 */
class ZarinpalPaymentService
{
    private const SUCCESS_CODES = [100, 101];

    public function request(Order $order): Payment
    {
        $settings = PaymentSetting::current();

        if (! $settings->isReady()) {
            throw new PaymentException('درگاه پرداخت زرین‌پال تنظیم یا فعال نشده است. لطفاً از بخش «تنظیمات پرداخت» اقدام کنید.');
        }

        $amount = $this->amountInRials($order->final_amount, $settings->currency);
        $callbackUrl = $settings->resolvedCallbackUrl();

        $payload = [
            'merchant_id' => (string) $settings->zarinpal_merchant_id,
            'amount' => $amount,
            'callback_url' => $callbackUrl,
            'description' => $this->buildDescription($order, $settings->description_template),
            'metadata' => array_filter([
                'mobile' => $order->customer_phone,
                'order_id' => $order->order_number,
            ]),
        ];

        try {
            $response = Http::timeout(30)
                ->acceptJson()
                ->post($this->apiBaseUrl($settings->sandbox_mode).'/pg/v4/payment/request.json', $payload);
        } catch (Throwable $e) {
            Log::channel('payment')->error('Zarinpal request could not be sent.', [
                'message' => $e->getMessage(),
                'order_id' => $order->id,
            ]);

            throw new PaymentException('ارتباط با درگاه پرداخت زرین‌پال برقرار نشد.');
        }

        $body = $response->json();
        $code = data_get($body, 'data.code');

        if (! in_array($code, self::SUCCESS_CODES, true)) {
            Log::channel('payment')->error('Zarinpal payment request failed.', [
                'order_id' => $order->id,
                'response' => $body,
            ]);

            $message = data_get($body, 'errors.message', 'درخواست پرداخت ناموفق بود.');

            throw new PaymentException("درخواست پرداخت ناموفق بود: {$message}");
        }

        $authority = data_get($body, 'data.authority');

        $payment = Payment::create([
            'order_id' => $order->id,
            'gateway' => 'zarinpal',
            'authority' => $authority,
            'amount' => $order->final_amount,
            'status' => 'pending',
            'request_payload' => ['request' => $payload, 'response' => $body],
        ]);

        Log::channel('payment')->info('Zarinpal payment request created.', [
            'order_id' => $order->id,
            'authority' => $authority,
        ]);

        app(AdminTelegramLogService::class)->notifyPaymentStarted($order);

        return $payment;
    }

    public function getPaymentUrl(Payment $payment): string
    {
        $settings = PaymentSetting::current();
        $base = $settings->sandbox_mode ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com';

        return "{$base}/pg/StartPay/{$payment->authority}";
    }

    /**
     * @return array{success: bool, message: string, ref_id: ?string, order: ?Order}
     */
    public function verify(string $authority): array
    {
        $payment = Payment::query()->where('authority', $authority)->with('order')->first();

        if (! $payment || ! $payment->order) {
            Log::channel('payment')->warning('Zarinpal callback received for unknown authority.', ['authority' => $authority]);

            return ['success' => false, 'message' => 'تراکنش یافت نشد.', 'ref_id' => null, 'order' => null];
        }

        $order = $payment->order;

        if ($payment->status === 'paid') {
            return ['success' => true, 'message' => 'این تراکنش قبلاً تایید شده است.', 'ref_id' => $payment->ref_id, 'order' => $order];
        }

        $settings = PaymentSetting::current();
        $amount = $this->amountInRials($payment->amount, $settings->currency);

        $payload = [
            'merchant_id' => (string) $settings->zarinpal_merchant_id,
            'amount' => $amount,
            'authority' => $authority,
        ];

        try {
            $response = Http::timeout(30)
                ->acceptJson()
                ->post($this->apiBaseUrl($settings->sandbox_mode).'/pg/v4/payment/verify.json', $payload);
        } catch (Throwable $e) {
            Log::channel('payment')->error('Zarinpal verify could not be sent.', [
                'message' => $e->getMessage(),
                'order_id' => $order->id,
            ]);

            return ['success' => false, 'message' => 'ارتباط با درگاه پرداخت برای تایید تراکنش برقرار نشد.', 'ref_id' => null, 'order' => $order];
        }

        $body = $response->json();
        $code = data_get($body, 'data.code');
        $refId = data_get($body, 'data.ref_id');

        $payment->update(['verify_payload' => $body]);

        if (! in_array($code, self::SUCCESS_CODES, true)) {
            $payment->update(['status' => 'failed']);
            $order->update(['status' => 'failed', 'payment_status' => 'failed']);

            Log::channel('payment')->error('Zarinpal payment verification failed.', [
                'order_id' => $order->id,
                'response' => $body,
            ]);

            $message = data_get($body, 'errors.message', 'پرداخت تایید نشد.');

            app(AdminTelegramLogService::class)->notifyPaymentFailed($order->fresh('product'), $message);

            return ['success' => false, 'message' => $message, 'ref_id' => null, 'order' => $order];
        }

        $payment->update([
            'status' => 'paid',
            'ref_id' => $refId,
            'paid_at' => now(),
        ]);

        $order->update([
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        Log::channel('payment')->info('Zarinpal payment verified successfully.', [
            'order_id' => $order->id,
            'ref_id' => $refId,
        ]);

        app(AdminTelegramLogService::class)->notifyOrderPaid($order->fresh('product'), $refId !== null ? (string) $refId : null);

        $this->dispatchFulfillment($order->id);

        return ['success' => true, 'message' => 'پرداخت با موفقیت انجام شد.', 'ref_id' => $refId, 'order' => $order];
    }

    public function cancelByAuthority(string $authority): ?Order
    {
        if (blank($authority)) {
            return null;
        }

        $payment = Payment::query()->where('authority', $authority)->with('order.product')->first();
        if (! $payment?->order) {
            return null;
        }

        if ($payment->status === 'pending') {
            $payment->update(['status' => 'canceled']);
            app(AdminTelegramLogService::class)->notifyPaymentCancelled($payment->order);
        }

        return $payment->order;
    }

    private function apiBaseUrl(bool $sandbox): string
    {
        return $sandbox ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com';
    }

    /**
     * Zarinpal's API expects the amount in Rials. Our amounts are stored in
     * the currency configured by the admin (Toman by default).
     */
    private function amountInRials(int $amount, ?string $currency): int
    {
        return $currency === 'IRR' ? $amount : $amount * 10;
    }

    private function buildDescription(Order $order, ?string $template): string
    {
        $template ??= 'خرید محصول {product_title} - سفارش {order_number}';

        return strtr($template, [
            '{order_number}' => $order->order_number,
            '{product_title}' => $order->product?->title,
        ]);
    }

    /** Local dev runs fulfillment immediately — no queue worker required. */
    private function dispatchFulfillment(int $orderId): void
    {
        if (app()->environment('local') && ! app()->runningUnitTests()) {
            FulfillOrderJob::dispatchSync($orderId);

            return;
        }

        FulfillOrderJob::dispatch($orderId);
    }
}
