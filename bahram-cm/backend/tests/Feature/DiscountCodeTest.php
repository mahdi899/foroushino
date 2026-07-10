<?php

namespace Tests\Feature;

use App\Enums\DiscountRestriction;
use App\Enums\DiscountType;
use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\DiscountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DiscountCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_percent_discount_respects_max_cap(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'package',
            'price' => 1_000_000,
            'is_active' => true,
        ]);

        DiscountCode::create([
            'code' => 'PCT20',
            'title' => '۲۰٪',
            'discount_type' => DiscountType::Percent,
            'discount_value' => 20,
            'is_active' => true,
            'restriction' => DiscountRestriction::All,
            'max_discount_amount' => 100_000,
        ]);

        $preview = app(DiscountService::class)->preview('pct20', $product, null, null, false);

        $this->assertSame(100_000, $preview['coupon_discount']);
        $this->assertSame(900_000, $preview['final_amount']);
    }

    public function test_expired_code_is_rejected(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'package',
            'price' => 500_000,
            'is_active' => true,
        ]);

        DiscountCode::create([
            'code' => 'OLD',
            'title' => 'منقضی',
            'discount_type' => DiscountType::Fixed,
            'discount_value' => 50_000,
            'is_active' => true,
            'ends_at' => now()->subDay(),
            'restriction' => DiscountRestriction::All,
        ]);

        $this->expectException(ValidationException::class);
        app(DiscountService::class)->preview('OLD', $product, null, null, false);
    }

    public function test_per_user_limit_is_enforced(): void
    {
        $user = User::create([
            'name' => 'دانشجو',
            'mobile' => '09121111111',
            'status' => 'active',
        ]);

        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'package',
            'price' => 400_000,
            'is_active' => true,
        ]);

        $code = DiscountCode::create([
            'code' => 'ONCE',
            'title' => 'یکبار',
            'discount_type' => DiscountType::Fixed,
            'discount_value' => 40_000,
            'is_active' => true,
            'max_uses_per_user' => 1,
            'restriction' => DiscountRestriction::All,
        ]);

        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'BC-TEST-00001',
            'product_id' => $product->id,
            'customer_name' => 'تست',
            'customer_phone' => '09121111111',
            'discount_code_id' => $code->id,
            'coupon_code' => 'ONCE',
            'amount' => 400_000,
            'discount_amount' => 40_000,
            'coupon_discount_amount' => 40_000,
            'final_amount' => 360_000,
            'status' => 'paid',
            'payment_status' => 'paid',
        ]);

        $code->usages()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'discount_amount' => 40_000,
        ]);

        $this->expectException(ValidationException::class);
        app(DiscountService::class)->preview('ONCE', $product, $user, null, false);
    }
}
