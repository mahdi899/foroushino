<?php

namespace App\Http\Controllers\Api;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\SendGuestCheckoutOtpRequest;
use App\Http\Requests\VerifyGuestCheckoutRequest;
use App\Services\Exceptions\OtpException;
use App\Services\Exceptions\PaymentException;
use App\Services\GuestCheckoutTokenService;
use App\Services\OrderService;
use App\Services\OtpService;
use App\Services\ZarinpalPaymentService;
use App\Support\ApiResponse;
use App\Support\Mobile;
use App\Support\StudentAccess;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GuestCheckoutController extends Controller
{
    public function __construct(
        private readonly GuestCheckoutTokenService $checkoutTokens,
        private readonly OtpService $otp,
        private readonly OrderService $orders,
        private readonly ZarinpalPaymentService $zarinpal,
    ) {}

    public function sendOtp(SendGuestCheckoutOtpRequest $request)
    {
        $data = $request->validated();
        $mobile = Mobile::normalize((string) $data['customer_phone']);

        if (! $mobile) {
            return ApiResponse::error('invalid_phone', 'شماره موبایل معتبر نیست.', 422);
        }

        if ($blocked = StudentAccess::blockedResponseForMobile($mobile)) {
            return $blocked;
        }

        $checkout = [
            'product_id' => (int) $data['product_id'],
            'customer_name' => trim((string) $data['customer_name']),
            'customer_phone' => $mobile,
            'customer_extra_data' => $data['customer_extra_data'] ?? null,
            'ref' => $data['ref'] ?? null,
            'coupon' => $data['coupon'] ?? null,
            'coupon_via_link' => (bool) ($data['coupon_via_link'] ?? false),
        ];

        $checkoutToken = $this->checkoutTokens->issue($checkout);

        try {
            $this->otp->send($mobile, OtpPurpose::GuestCheckout, $request->ip(), $request->userAgent());
        } catch (OtpException $e) {
            $this->checkoutTokens->revoke($checkoutToken);

            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success([
            'checkout_token' => $checkoutToken,
            'customer_phone_masked' => Mobile::mask($mobile),
            'otp_sent' => true,
        ]);
    }

    public function resendOtp(Request $request)
    {
        $data = $request->validate([
            'checkout_token' => ['required', 'string', 'max:1024'],
        ]);

        $checkout = $this->checkoutTokens->resolve((string) $data['checkout_token']);
        if (! $checkout) {
            return ApiResponse::error('invalid_checkout_token', 'نشست خرید نامعتبر یا منقضی شده است.', 403);
        }

        if ($blocked = StudentAccess::blockedResponseForMobile($checkout['customer_phone'])) {
            return $blocked;
        }

        try {
            $this->otp->send(
                $checkout['customer_phone'],
                OtpPurpose::GuestCheckout,
                $request->ip(),
                $request->userAgent(),
            );
        } catch (OtpException $e) {
            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success(['otp_sent' => true]);
    }

    public function verifyAndPay(VerifyGuestCheckoutRequest $request)
    {
        $data = $request->validated();
        $checkoutToken = (string) $data['checkout_token'];
        $checkout = $this->checkoutTokens->resolve($checkoutToken);

        if (! $checkout) {
            return ApiResponse::error('invalid_checkout_token', 'نشست خرید نامعتبر یا منقضی شده است.', 403);
        }

        if ($blocked = StudentAccess::blockedResponseForMobile($checkout['customer_phone'])) {
            return $blocked;
        }

        try {
            $this->otp->verify(
                $checkout['customer_phone'],
                (string) $data['code'],
                OtpPurpose::GuestCheckout,
            );
        } catch (OtpException $e) {
            return ApiResponse::error('otp_invalid', $e->getMessage(), 422);
        }

        try {
            $order = $this->orders->create($checkout);
        } catch (ValidationException $e) {
            return ApiResponse::error(
                'order_validation_failed',
                collect($e->errors())->flatten()->first() ?? 'ثبت سفارش ناموفق بود.',
                422,
                $e->errors(),
            );
        }

        try {
            $payment = $this->zarinpal->request($order);
        } catch (PaymentException $e) {
            return ApiResponse::error('payment_gateway_error', $e->getMessage(), 502);
        }

        $this->checkoutTokens->revoke($checkoutToken);

        return ApiResponse::success([
            'payment_url' => $this->zarinpal->getPaymentUrl($payment),
            'order_number' => $order->order_number,
            'authority' => $payment->authority,
        ]);
    }
}
