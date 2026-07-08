<?php

namespace App\Http\Controllers\Api;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\CompleteOrderCustomerRequest;
use App\Http\Requests\StoreOrderRequest;
use App\Models\User;
use App\Services\Exceptions\OtpException;
use App\Services\OrderCompletionTokenService;
use App\Services\OrderService;
use App\Services\OtpService;
use App\Services\PaymentReceiptTokenService;
use App\Services\PostPaymentLoginTokenService;
use App\Services\StudentOnboardingService;
use App\Support\ApiResponse;
use App\Support\Mobile;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orders,
        private readonly OrderCompletionTokenService $completionTokens,
        private readonly PaymentReceiptTokenService $receiptTokens,
        private readonly PostPaymentLoginTokenService $postPaymentLoginTokens,
        private readonly OtpService $otp,
        private readonly StudentOnboardingService $onboarding,
    ) {}

    public function store(StoreOrderRequest $request)
    {
        $user = $this->optionalStudent($request);
        $payload = $request->validated();

        if ($user) {
            $payload = $this->orders->mergeAuthenticatedCustomer($payload, $user);
        }

        $order = $this->orders->create($payload, $user);

        return ApiResponse::success([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'amount' => $order->amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
        ], 201);
    }

    public function completeCustomer(CompleteOrderCustomerRequest $request)
    {
        $token = (string) $request->validated('completion_token');
        $order = $this->completionTokens->resolve($token);

        if (! $order) {
            return ApiResponse::error(
                'invalid_completion_token',
                'لینک تکمیل اطلاعات نامعتبر یا منقضی شده است.',
                403,
            );
        }

        $order = $this->orders->completeCustomerProfile($order, [
            'customer_name' => $request->validated('customer_name'),
            'customer_email' => $request->validated('customer_email'),
        ]);

        $this->completionTokens->revoke($token);

        $order = $order->fresh();
        $postLoginToken = $this->postPaymentLoginTokens->issue($order);
        $otpSent = false;

        if ($postLoginToken) {
            $mobile = Mobile::normalize($order->customer_phone);
            if ($mobile) {
                try {
                    $this->otp->send($mobile, OtpPurpose::Login, $request->ip(), $request->userAgent());
                    $otpSent = true;
                } catch (OtpException) {
                    $otpSent = false;
                }
            }
        }

        return ApiResponse::success([
            'completed' => true,
            'post_login_token' => $postLoginToken,
            'customer_phone_masked' => Mobile::mask($order->customer_phone),
            'otp_sent' => $otpSent,
        ]);
    }

    public function completeProfileContext(Request $request)
    {
        $token = (string) $request->query('token', '');
        $order = $this->completionTokens->resolve($token);

        if (! $order) {
            return ApiResponse::error(
                'invalid_completion_token',
                'لینک تکمیل اطلاعات نامعتبر یا منقضی شده است.',
                403,
            );
        }

        return ApiResponse::success([
            'order_number' => $order->order_number,
            'customer_phone_masked' => Mobile::mask($order->customer_phone),
            'customer_email' => $order->customer_email,
            'product_slug' => $order->product?->slug,
        ]);
    }

    public function paymentResult(Request $request)
    {
        $token = (string) $request->query('token', '');
        $result = $this->receiptTokens->resolve($token);

        if (! $result) {
            return ApiResponse::error(
                'invalid_payment_receipt',
                'لینک نتیجه پرداخت نامعتبر یا منقضی شده است.',
                403,
            );
        }

        return ApiResponse::success($result);
    }

    public function postPaymentResendOtp(Request $request)
    {
        $data = $request->validate([
            'post_login_token' => ['required', 'string', 'max:512'],
        ]);

        $resolved = $this->postPaymentLoginTokens->resolve((string) $data['post_login_token']);
        if (! $resolved) {
            return ApiResponse::error('invalid_post_login_token', 'نشست ورود نامعتبر یا منقضی شده است.', 403);
        }

        [, $mobile] = $resolved;

        try {
            $this->otp->send($mobile, OtpPurpose::Login, $request->ip(), $request->userAgent());
        } catch (OtpException $e) {
            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success(['otp_sent' => true]);
    }

    public function postPaymentVerifyOtp(Request $request)
    {
        $data = $request->validate([
            'post_login_token' => ['required', 'string', 'max:512'],
            'code' => ['required', 'string', 'max:10'],
        ]);

        $resolved = $this->postPaymentLoginTokens->resolve((string) $data['post_login_token']);
        if (! $resolved) {
            return ApiResponse::error('invalid_post_login_token', 'نشست ورود نامعتبر یا منقضی شده است.', 403);
        }

        [$user, $mobile] = $resolved;

        try {
            $this->otp->verify($mobile, (string) $data['code'], OtpPurpose::Login);
        } catch (OtpException $e) {
            return ApiResponse::error('otp_invalid', $e->getMessage(), 422);
        }

        if ($user->mobile_verified_at === null) {
            $user->update(['mobile_verified_at' => now()]);
        }

        $user->update(['last_login_at' => now()]);
        $this->onboarding->handleFirstLogin($user);

        $this->postPaymentLoginTokens->revoke((string) $data['post_login_token']);

        $token = $user->createToken('student-panel', ['student'])->plainTextToken;

        return ApiResponse::success(['token' => $token]);
    }

    private function optionalStudent(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;

        if (! $user instanceof User || $user->is_admin) {
            return null;
        }

        return $user;
    }
}
