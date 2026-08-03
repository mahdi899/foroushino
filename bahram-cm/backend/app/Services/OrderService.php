<?php

namespace App\Services;

use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ReferralConversion;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\SpotplayerLicense;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramPaymentLink;
use App\Services\AdminTelegramLogService;
use App\Services\DiscountService;
use App\Services\PurchaseGuardService;
use App\Support\Mobile;
use App\Support\PurchaseRateLimit;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        private readonly PurchaseGuardService $purchaseGuard,
        private readonly AdminAuditLogger $audit,
        private readonly TelegramHostAccountSync $telegramSync,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?User $authenticatedUser = null): Order
    {
        $product = Product::query()->active()->find($data['product_id']);

        if (! $product) {
            throw ValidationException::withMessages([
                'product_id' => 'محصول انتخاب‌شده در دسترس نیست.',
            ]);
        }

        $phone = Mobile::normalize($data['customer_phone']);
        if (! $phone) {
            throw ValidationException::withMessages([
                'customer_phone' => 'شماره موبایل معتبر نیست.',
            ]);
        }

        $name = trim((string) ($data['customer_name'] ?? ''));
        if ($name === '') {
            $name = Order::PLACEHOLDER_CUSTOMER_NAME;
        }

        $userId = $authenticatedUser?->id ?? $this->resolveUserId($phone, $name);
        $this->purchaseGuard->assertCanPurchase($authenticatedUser, $phone, $product);
        $this->assertSeminarPurchaseAllowed($product, $userId, $phone);

        $pricing = $product->isReferenceChannelProduct()
            ? app(ReferenceChannelPricingService::class)->quoteForProduct($product, $authenticatedUser, $phone)
            : app(SeminarAttendeeCoursePricing::class)->quote($product, $authenticatedUser, $phone);
        $amount = (int) $pricing['amount'];
        $finalAmount = (int) $pricing['final_amount'];
        $saleDiscount = max($amount - $finalAmount, 0);

        $validatedReferralCode = app(ReferralService::class)->validateForOrder(
            $data['ref'] ?? null,
            $authenticatedUser,
        );

        $couponDiscount = 0;
        $discountCodeId = null;
        $couponCode = null;

        if (filled($data['coupon'] ?? null)) {
            $discounts = app(DiscountService::class);
            $preview = $discounts->preview(
                (string) $data['coupon'],
                $product,
                $authenticatedUser,
                $phone,
                (bool) ($data['coupon_via_link'] ?? false),
            );
            $couponDiscount = $preview['coupon_discount'];
            $finalAmount = $preview['final_amount'];
            $discountCodeId = $preview['discount_code']->id;
            $couponCode = $preview['discount_code']->normalizedCode();
        }

        $discountAmount = $saleDiscount + $couponDiscount;

        $lockKey = 'purchase_create:'.PurchaseRateLimit::hashMobile($phone).':'.$product->id;
        $lock = Cache::lock($lockKey, 10);

        try {
            $order = $lock->block(2, function () use (
                $userId,
                $product,
                $name,
                $phone,
                $data,
                $validatedReferralCode,
                $discountCodeId,
                $couponCode,
                $amount,
                $discountAmount,
                $couponDiscount,
                $finalAmount,
            ) {
                return DB::transaction(function () use (
                    $userId,
                    $product,
                    $name,
                    $phone,
                    $data,
                    $validatedReferralCode,
                    $discountCodeId,
                    $couponCode,
                    $amount,
                    $discountAmount,
                    $couponDiscount,
                    $finalAmount,
                ) {
                    $this->cancelOpenPendingOrders($product->id, $userId, $phone);

                    return Order::create([
                        'user_id' => $userId,
                        'order_number' => $this->generateOrderNumber(),
                        'product_id' => $product->id,
                        'customer_name' => $name,
                        'customer_phone' => $phone,
                        'customer_email' => $data['customer_email'] ?? null,
                        'customer_national_code' => $data['customer_national_code'] ?? null,
                        'customer_extra_data' => $data['customer_extra_data'] ?? null,
                        'referral_code' => $validatedReferralCode,
                        'discount_code_id' => $discountCodeId,
                        'coupon_code' => $couponCode,
                        'amount' => $amount,
                        'discount_amount' => $discountAmount,
                        'coupon_discount_amount' => $couponDiscount,
                        'final_amount' => $finalAmount,
                        'status' => 'pending_payment',
                        'payment_status' => 'pending',
                    ]);
                });
            });
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages([
                'product_id' => 'درخواست قبلی هنوز در حال پردازش است. چند ثانیه صبر کنید.',
            ]);
        }

        app(AdminTelegramLogService::class)->notifyOrderCreated($order->load('product'));

        return $order;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function mergeAuthenticatedCustomer(array $data, User $user): array
    {
        $user->loadMissing('profile');
        $profile = $user->profile;

        $fullName = trim(implode(' ', array_filter([
            $profile?->first_name,
            $profile?->last_name,
        ])));

        return array_merge($data, [
            'customer_name' => $fullName !== '' ? $fullName : ($user->name ?: Order::PLACEHOLDER_CUSTOMER_NAME),
            'customer_phone' => $user->mobile ?? $data['customer_phone'],
            'customer_email' => $profile?->email ?? ($data['customer_email'] ?? null),
        ]);
    }

    /**
     * @param  array{customer_name: string, customer_email?: string|null}  $data
     */
    public function completeCustomerProfile(Order $order, array $data): Order
    {
        if (! $order->isPaid()) {
            throw ValidationException::withMessages([
                'order_number' => 'این سفارش هنوز پرداخت نشده است.',
            ]);
        }

        $orderPhone = Mobile::normalize($order->customer_phone);
        if (! $orderPhone) {
            throw ValidationException::withMessages([
                'order_number' => 'شماره موبایل سفارش نامعتبر است.',
            ]);
        }

        $order->update([
            'customer_name' => trim($data['customer_name']),
            'customer_email' => $data['customer_email'] ?? $order->customer_email,
        ]);

        app(AdminTelegramLogService::class)->notifyProfileCompleted($order->fresh('product'));

        if ($order->user_id) {
            $user = User::query()->with('profile')->find($order->user_id);
            if ($user) {
                $parts = preg_split('/\s+/', trim($data['customer_name']), 2) ?: [];
                $user->update(['name' => trim($data['customer_name'])]);
                $user->profile()->updateOrCreate(
                    ['user_id' => $user->id],
                    array_filter([
                        'first_name' => $parts[0] ?? null,
                        'last_name' => $parts[1] ?? null,
                        'email' => $data['customer_email'] ?? null,
                    ], fn ($v) => $v !== null && $v !== ''),
                );
            }
        }

        return $order->fresh();
    }

    public function syncLinkedUserFromOrder(Order $order): void
    {
        if (! $order->user_id) {
            return;
        }

        $user = User::query()->with('profile')->find($order->user_id);
        if (! $user || $user->is_admin) {
            return;
        }

        $customerName = trim((string) $order->customer_name);
        if ($customerName === '' || $customerName === Order::PLACEHOLDER_CUSTOMER_NAME) {
            return;
        }

        $parts = preg_split('/\s+/', $customerName, 2) ?: [];
        $placeholderNames = ['', 'دانشجو', Order::PLACEHOLDER_CUSTOMER_NAME];

        if (in_array(trim((string) $user->name), $placeholderNames, true)) {
            $user->update(['name' => $customerName]);
        }

        if (! $user->profile?->first_name) {
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                array_filter([
                    'first_name' => $parts[0] ?? null,
                    'last_name' => $parts[1] ?? null,
                ], fn ($v) => $v !== null && $v !== ''),
            );
        }
    }

  /**
     * Silently links the order to a student account (creating one if
     * needed) so that a paid order can grant a course_access/panel login,
     * without changing the guest-checkout UX.
     */
    private function resolveUserId(string $rawPhone, string $customerName = ''): ?int
    {
        $mobile = Mobile::normalize($rawPhone);

        if (! $mobile) {
            return null;
        }

        $user = User::query()->where('mobile', $mobile)->first();

        if ($user) {
            return $user->is_admin ? null : $user->id;
        }

        $displayName = trim($customerName);
        if (
            $displayName === ''
            || $displayName === Order::PLACEHOLDER_CUSTOMER_NAME
            || $displayName === 'دانشجو'
        ) {
            $displayName = 'دانشجو';
        }

        $user = User::create([
            'name' => $displayName,
            'mobile' => $mobile,
            'status' => 'active',
        ]);

        if ($displayName !== 'دانشجو') {
            $parts = preg_split('/\s+/', $displayName, 2) ?: [];
            $user->profile()->create(array_filter([
                'first_name' => $parts[0] ?? null,
                'last_name' => $parts[1] ?? null,
            ], fn ($v) => $v !== null && $v !== ''));
        }

        return $user->id;
    }

    /**
     * Cancel unpaid pending_payment orders older than the TTL (default 1 hour).
     *
     * @return array{cancelled: int}
     */
    public function expireStalePendingOrders(?int $ttlMinutes = null): array
    {
        $minutes = $ttlMinutes ?? (int) config('bahram.orders.pending_ttl_minutes', 60);
        $cutoff = now()->subMinutes(max(1, $minutes));

        $cancelled = 0;

        Order::query()
            ->where('status', 'pending_payment')
            ->whereNull('paid_at')
            ->where('created_at', '<=', $cutoff)
            ->orderBy('id')
            ->chunkById(100, function ($orders) use (&$cancelled): void {
                foreach ($orders as $order) {
                    if ($order->isPaid()) {
                        continue;
                    }

                    // C2C has its own receipt (15m) and review (3d) expire paths.
                    $c2cStatus = (string) data_get($order->customer_extra_data, 'card_to_card.status', '');
                    if (in_array($c2cStatus, ['waiting_for_receipt', 'awaiting_review'], true)) {
                        continue;
                    }

                    $order->update([
                        'status' => 'cancelled',
                        'payment_status' => 'canceled',
                    ]);

                    Payment::query()
                        ->where('order_id', $order->id)
                        ->where('status', 'pending')
                        ->update(['status' => 'canceled']);

                    $cancelled++;
                }
            });

        return ['cancelled' => $cancelled];
    }

    /**
     * Permanently delete cancelled unpaid orders older than the retention window (default 7 days).
     *
     * @return array{deleted: int}
     */
    public function purgeCancelledOrders(?int $days = null): array
    {
        $retentionDays = $days ?? (int) config('bahram.orders.cancelled_purge_days', 7);
        $cutoff = now()->subDays(max(1, $retentionDays));

        $query = Order::query()
            ->where('status', 'cancelled')
            ->whereNull('paid_at')
            ->where('updated_at', '<=', $cutoff);

        $deleted = 0;

        $query->orderBy('id')->chunkById(100, function ($orders) use (&$deleted): void {
            foreach ($orders as $order) {
                if ($order->isPaid()) {
                    continue;
                }

                $order->delete();
                $deleted++;
            }
        });

        return ['deleted' => $deleted];
    }

    public function deleteOrder(User $actor, Order $order, bool $force = false): void
    {
        $paidStatuses = ['paid', 'fulfilled'];
        if (! $force && in_array($order->status, $paidStatuses, true)) {
            throw ValidationException::withMessages([
                'order' => ['برای حذف سفارش پرداخت‌شده، گزینه تأیید اجباری را فعال کنید.'],
            ]);
        }

        $userId = $order->user_id;
        $customerPhone = $order->customer_phone;
        $user = $userId ? User::query()->find($userId) : null;

        \Illuminate\Support\Facades\DB::transaction(function () use ($actor, $order): void {
            ReferralConversion::query()->where('order_id', $order->id)->delete();
            CourseAccess::query()->where('order_id', $order->id)->delete();
            SpotplayerLicense::query()->where('order_id', $order->id)->delete();
            $order->items()->delete();
            $order->payments()->delete();

            $this->audit->log($actor, 'order.deleted', $order, [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'user_id' => $order->user_id,
                'status' => $order->status,
            ]);

            $order->delete();
        });

        $this->telegramSync->syncAccessAfterDeletion(
            $user,
            $customerPhone,
            [],
            'order_deleted',
        );
    }

    private function generateOrderNumber(): string
    {
        do {
            $number = 'BC-'.now()->format('ymd').'-'.strtoupper(Str::random(5));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }

  /**
     * Cancel unpaid pending orders for the same buyer + product before opening a new checkout.
     */
    private function cancelOpenPendingOrders(int $productId, ?int $userId, string $phone): void
    {
        $orders = Order::query()
            ->where('product_id', $productId)
            ->where('status', 'pending_payment')
            ->whereNull('paid_at')
            ->where(function ($query) use ($userId, $phone): void {
                $query->where('customer_phone', $phone);
                if ($userId !== null) {
                    $query->orWhere('user_id', $userId);
                }
            })
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($orders as $order) {
            if ($order->isPaid()) {
                continue;
            }

            $this->cancelPendingOrder($order);
        }
    }

    private function cancelPendingOrder(Order $order): void
    {
        $order->update([
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        Payment::query()
            ->where('order_id', $order->id)
            ->where('status', 'pending')
            ->update(['status' => 'canceled']);

        TelegramPaymentLink::query()
            ->where('order_id', $order->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    private function assertSeminarPurchaseAllowed(Product $product, ?int $userId, string $phone): void
    {
        $seminar = Seminar::query()->where('product_id', $product->id)->first();

        if (! $seminar) {
            return;
        }

        if ($seminar->isFull()) {
            throw ValidationException::withMessages([
                'product_id' => 'ظرفیت این سمینار تکمیل شده است.',
            ]);
        }

        if ($seminar->capacity) {
            $pendingOrders = Order::query()
                ->where('product_id', $product->id)
                ->where('status', 'pending_payment')
                ->count();

            if (($seminar->registeredCount() + $pendingOrders) >= (int) $seminar->capacity) {
                throw ValidationException::withMessages([
                    'product_id' => 'ظرفیت این سمینار تکمیل شده است.',
                ]);
            }
        }

        if ($userId && SeminarAttendee::query()
            ->where('seminar_id', $seminar->id)
            ->where('user_id', $userId)
            ->where('attendance_status', '!=', 'absent')
            ->exists()) {
            throw ValidationException::withMessages([
                'product_id' => 'شما قبلاً در این سمینار ثبت‌نام کرده‌اید.',
            ]);
        }

        $mobileUser = User::query()->where('mobile', $phone)->first();
        if ($mobileUser && SeminarAttendee::query()
            ->where('seminar_id', $seminar->id)
            ->where('user_id', $mobileUser->id)
            ->where('attendance_status', '!=', 'absent')
            ->exists()) {
            throw ValidationException::withMessages([
                'product_id' => 'شما قبلاً در این سمینار ثبت‌نام کرده‌اید.',
            ]);
        }
    }
}
