<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\AdminTelegramLogService;
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

        $amount = (int) $product->price;
        $finalAmount = (int) $product->effective_price;
        $discountAmount = max($amount - $finalAmount, 0);

        $userId = $authenticatedUser?->id ?? $this->resolveUserId($phone);
        $name = trim((string) ($data['customer_name'] ?? ''));
        if ($name === '') {
            $name = Order::PLACEHOLDER_CUSTOMER_NAME;
        }

        $this->assertReferralCodeNotSelf($data['ref'] ?? null, $authenticatedUser);

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
            'amount' => $amount,
            'discount_amount' => $discountAmount,
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

  /**
     * Silently links the order to a student account (creating one if
     * needed) so that a paid order can grant a course_access/panel login,
     * without changing the guest-checkout UX.
     */
    private function resolveUserId(string $rawPhone): ?int
    {
        $mobile = Mobile::normalize($rawPhone);

        if (! $mobile) {
            return null;
        }

        $user = User::query()->where('mobile', $mobile)->first();

        if ($user) {
            return $user->is_admin ? null : $user->id;
        }

        $user = User::create([
            'name' => 'دانشجو',
            'mobile' => $mobile,
            'status' => 'active',
        ]);

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
}
