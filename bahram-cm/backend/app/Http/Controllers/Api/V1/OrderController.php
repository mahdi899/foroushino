<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\FulfillOrderJob;
use App\Jobs\SendSmsJob;
use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Payment;
use App\Services\AdminTelegramLogService;
use App\Services\OrderAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private readonly OrderAnalyticsService $analytics) {}

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
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($productQuery) use ($search) {
                        $productQuery
                            ->where('title', 'like', "%{$search}%")
                            ->orWhere('type', 'like', "%{$search}%");
                    });
            });
        }

        if ($productType = $request->string('product_type')->toString()) {
            $query->whereHas('product', fn ($q) => $q->where('type', $productType));
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

    public function analytics(Request $request): JsonResponse
    {
        $daysInput = $request->input('days');
        $days = $daysInput === 'all' || $daysInput === null || $daysInput === ''
            ? null
            : max(1, min(365, (int) $daysInput));

        return response()->json(['data' => $this->analytics->report($days)]);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load([
            'product',
            'payments' => fn ($q) => $q->orderByDesc('id'),
            'spotplayerLicense',
            'courseAccess',
            'user:id,name,mobile',
            'referralConversion.referrer:id,name,mobile',
        ]);

        return response()->json(['data' => $this->detailedPayload($order)]);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['pending_payment', 'paid', 'fulfilled', 'failed', 'cancelled'])],
            'payment_status' => ['sometimes', 'string', Rule::in(['pending', 'paid', 'failed'])],
        ]);

        $changes = [];
        foreach ($data as $field => $value) {
            if ($order->getAttribute($field) !== $value) {
                $changes[$field] = $value;
            }
        }

        $order->update($data);
        $order->load([
            'product',
            'payments' => fn ($q) => $q->orderByDesc('id'),
            'spotplayerLicense',
            'courseAccess',
            'user:id,name,mobile',
            'referralConversion.referrer:id,name,mobile',
        ]);

        if ($changes !== []) {
            app(AdminTelegramLogService::class)->notifyOrderUpdated($order, $changes);
        }

        return response()->json(['data' => $this->detailedPayload($order)]);
    }

    public function resendSms(Order $order): JsonResponse
    {
        if (! $order->isPaid()) {
            return response()->json(['message' => 'فقط سفارش‌های پرداخت‌شده قابل ارسال مجدد پیامک هستند.'], 422);
        }

        SendSmsJob::dispatch($order->id);

        return response()->json(['ok' => true, 'message' => 'درخواست ارسال مجدد پیامک ثبت شد.']);
    }

    public function fulfill(Order $order): JsonResponse
    {
        if (! $order->isPaid()) {
            return response()->json(['message' => 'فقط سفارش‌های پرداخت‌شده قابل تحویل هستند.'], 422);
        }

        if (! $order->product_id) {
            return response()->json(['message' => 'این سفارش محصول مرتبط ندارد.'], 422);
        }

        $order->loadMissing('product');
        if (blank($order->product?->spotplayer_course_id)) {
            return response()->json(['message' => 'محصول این سفارش به SpotPlayer متصل نیست.'], 422);
        }

        try {
            FulfillOrderJob::dispatchSync($order->id);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'تحویل سفارش ناموفق بود: '.$e->getMessage(),
            ], 502);
        }

        $order->refresh()->load([
            'product',
            'payments' => fn ($q) => $q->orderByDesc('id'),
            'spotplayerLicense',
            'courseAccess',
            'user:id,name,mobile',
            'referralConversion.referrer:id,name,mobile',
        ]);

        $licenseKey = $order->spotplayer_license_code ?: $order->spotplayerLicense?->license_key;

        return response()->json([
            'ok' => true,
            'message' => filled($licenseKey)
                ? 'لایسنس و دسترسی دوره با موفقیت فعال شد.'
                : 'تحویل اجرا شد اما لایسنس صادر نشد — تنظیمات SpotPlayer یا لاگ سرور را بررسی کنید.',
            'data' => $this->detailedPayload($order),
        ]);
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
            'product_type' => $order->product?->type,
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

    /** @return array<string, mixed> */
    private function detailedPayload(Order $order): array
    {
        return [
            ...$this->payload($order, true),
            'user_id' => $order->user_id,
            'user_name' => $order->user?->name,
            'user_mobile' => $order->user?->mobile,
            'referral_code' => $order->referral_code,
            'customer_extra_data' => $order->customer_extra_data,
            'product' => $order->product ? [
                'id' => $order->product->id,
                'title' => $order->product->title,
                'spotplayer_course_id' => $order->product->spotplayer_course_id,
                'spotplayer_product_id' => $order->product->spotplayer_product_id,
            ] : null,
            'payments' => $order->payments->map(fn (Payment $p) => $this->paymentPayload($p))->values()->all(),
            'spotplayer_license' => $order->spotplayerLicense ? [
                'id' => $order->spotplayerLicense->id,
                'license_key' => $order->spotplayerLicense->license_key,
                'license_url' => $order->spotplayerLicense->license_url,
                'spotplayer_course_id' => $order->spotplayerLicense->spotplayer_course_id,
                'spotplayer_license_id' => data_get($order->spotplayerLicense->raw_response, '_id'),
                'device_limit' => $order->spotplayerLicense->device_limit,
                'status' => $order->spotplayerLicense->status->value,
                'created_at' => $order->spotplayerLicense->created_at?->toIso8601String(),
                'updated_at' => $order->spotplayerLicense->updated_at?->toIso8601String(),
            ] : null,
            'course_access' => $this->courseAccessPayload($order),
            'referral_conversion' => $order->referralConversion ? [
                'id' => $order->referralConversion->id,
                'status' => $order->referralConversion->status->value,
                'cashback_amount' => $order->referralConversion->cashback_amount,
                'referrer_name' => $order->referralConversion->referrer?->name,
                'referrer_mobile' => $order->referralConversion->referrer?->mobile,
            ] : null,
        ];
    }

    /** @return array<string, mixed>|null */
    private function courseAccessPayload(Order $order): ?array
    {
        $access = $order->courseAccess;

        if (! $access && $order->user_id && $order->product_id) {
            $access = CourseAccess::query()
                ->where('user_id', $order->user_id)
                ->where('product_id', $order->product_id)
                ->first();
        }

        if (! $access) {
            return null;
        }

        return [
            'id' => $access->id,
            'status' => $access->status->value,
            'source' => $access->source->value,
            'access_type' => $access->access_type,
            'activated_at' => $access->activated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function paymentPayload(Payment $payment): array
    {
        $isSandbox = str_starts_with((string) $payment->authority, 'DEV-')
            || data_get($payment->verify_payload, 'dev_mode')
            || data_get($payment->request_payload, 'dev_mode');

        return [
            'id' => $payment->id,
            'gateway' => $payment->gateway,
            'gateway_label' => $payment->gateway === 'zarinpal' ? 'زرین‌پال' : $payment->gateway,
            'mode' => $isSandbox ? 'sandbox' : 'live',
            'mode_label' => $isSandbox ? 'تست / سندباکس' : 'واقعی',
            'authority' => $payment->authority,
            'ref_id' => $payment->ref_id,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'card_pan' => data_get($payment->verify_payload, 'data.card_pan'),
            'verify_code' => data_get($payment->verify_payload, 'data.code'),
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'created_at' => $payment->created_at?->toIso8601String(),
        ];
    }
}
