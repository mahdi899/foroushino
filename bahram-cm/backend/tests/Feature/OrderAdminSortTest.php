<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderAdminSortTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_orders_index_sorts_by_amount_desc(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'sort-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $low = Order::create([
            'order_number' => 'BC-LOW',
            'product_id' => $product->id,
            'customer_name' => 'الف',
            'customer_phone' => '09120001111',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $high = Order::create([
            'order_number' => 'BC-HIGH',
            'product_id' => $product->id,
            'customer_name' => 'ب',
            'customer_phone' => '09120002222',
            'amount' => 30_000_000,
            'discount_amount' => 0,
            'final_amount' => 30_000_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/v1/orders?sort=amount&dir=desc');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame([$high->id, $low->id], $ids);
    }

    public function test_orders_index_filters_by_days(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'days-'.uniqid(),
            'type' => 'normal',
            'price' => 100_000,
            'is_active' => true,
        ]);

        $recent = Order::create([
            'order_number' => 'BC-RECENT',
            'product_id' => $product->id,
            'customer_name' => 'جدید',
            'customer_phone' => '09120003333',
            'amount' => 100_000,
            'discount_amount' => 0,
            'final_amount' => 100_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);
        $recent->forceFill(['created_at' => now()->subDays(2)])->saveQuietly();

        $old = Order::create([
            'order_number' => 'BC-OLD',
            'product_id' => $product->id,
            'customer_name' => 'قدیمی',
            'customer_phone' => '09120004444',
            'amount' => 100_000,
            'discount_amount' => 0,
            'final_amount' => 100_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now()->subDays(40),
        ]);
        $old->forceFill(['created_at' => now()->subDays(40)])->saveQuietly();

        $response = $this->getJson('/api/v1/orders?days=7');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame([$recent->id], $ids);
        $this->assertNotContains($old->id, $ids);
    }

    public function test_orders_index_filters_by_custom_date_range(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'range-'.uniqid(),
            'type' => 'normal',
            'price' => 100_000,
            'is_active' => true,
        ]);

        $inRange = Order::create([
            'order_number' => 'BC-RANGE',
            'product_id' => $product->id,
            'customer_name' => 'داخل بازه',
            'customer_phone' => '09120005555',
            'amount' => 100_000,
            'discount_amount' => 0,
            'final_amount' => 100_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now()->subDays(10),
        ]);
        $inRange->forceFill(['created_at' => now()->subDays(10)])->saveQuietly();

        $outOfRange = Order::create([
            'order_number' => 'BC-OUT',
            'product_id' => $product->id,
            'customer_name' => 'خارج بازه',
            'customer_phone' => '09120006666',
            'amount' => 100_000,
            'discount_amount' => 0,
            'final_amount' => 100_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now()->subDays(50),
        ]);
        $outOfRange->forceFill(['created_at' => now()->subDays(50)])->saveQuietly();

        $from = now()->subDays(20)->toDateString();
        $to = now()->subDays(5)->toDateString();

        $response = $this->getJson("/api/v1/orders?from={$from}&to={$to}");

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame([$inRange->id], $ids);
        $this->assertNotContains($outOfRange->id, $ids);
    }
}
