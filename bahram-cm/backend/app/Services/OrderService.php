<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Order
    {
        $product = Product::query()->active()->find($data['product_id']);

        if (! $product) {
            throw ValidationException::withMessages([
                'product_id' => 'محصول انتخاب‌شده در دسترس نیست.',
            ]);
        }

        $amount = (int) $product->price;
        $finalAmount = (int) $product->effective_price;
        $discountAmount = max($amount - $finalAmount, 0);

        return Order::create([
            'user_id' => $this->resolveUserId($data['customer_phone']),
            'order_number' => $this->generateOrderNumber(),
            'product_id' => $product->id,
            'customer_name' => $data['customer_name'],
            'customer_phone' => $data['customer_phone'],
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
}
