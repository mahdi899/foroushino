<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Services\AdminTelegramLogService;
use App\Services\DiscountService;
use App\Support\Mobile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
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
        $this->assertSeminarPurchaseAllowed($product, $userId, $phone);

        $amount = (int) $product->price;
        $finalAmount = (int) $product->effective_price;
        $saleDiscount = max($amount - $finalAmount, 0);

        $this->assertReferralCodeNotSelf($data['ref'] ?? null, $authenticatedUser);

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

        $order = Order::create([
            'user_id' => $userId,
            'order_number' => $this->generateOrderNumber(),
            'product_id' => $product->id,
            'customer_name' => $name,
            'customer_phone' => $phone,
            'customer_email' => $data['customer_email'] ?? null,
            'customer_national_code' => $data['customer_national_code'] ?? null,
            'customer_extra_data' => $data['customer_extra_data'] ?? null,
            'referral_code' => $data['ref'] ?? null,
            'discount_code_id' => $discountCodeId,
            'coupon_code' => $couponCode,
            'amount' => $amount,
            'discount_amount' => $discountAmount,
            'coupon_discount_amount' => $couponDiscount,
            'final_amount' => $finalAmount,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

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

    private function generateOrderNumber(): string
    {
        do {
            $number = 'BC-'.now()->format('ymd').'-'.strtoupper(Str::random(5));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }

    private function assertReferralCodeNotSelf(?string $ref, ?User $user): void
    {
        if (! filled($ref) || ! $user) {
            return;
        }

        $user->loadMissing('referralCode');
        $ownCode = $user->referralCode?->code;

        if ($ownCode && strcasecmp(trim($ref), $ownCode) === 0) {
            throw ValidationException::withMessages([
                'ref' => 'نمی‌توانید از کد معرف خودتان استفاده کنید.',
            ]);
        }
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
