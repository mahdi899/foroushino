<?php

namespace Tests\Unit\Support;

use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\CourseAccessService;
use App\Support\AccessSyncCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AccessSyncCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_course_sync_is_throttled_until_cache_is_cleared(): void
    {
        Cache::flush();

        $user = User::factory()->create(['mobile' => '09121234567']);
        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'test-course',
            'type' => 'normal',
            'price' => 1_000_000,
            'is_active' => true,
        ]);

        $service = app(CourseAccessService::class);
        $service->syncFromPaidOrders($user);

        Order::create([
            'order_number' => 'BC-SYNC-1',
            'user_id' => $user->id,
            'product_id' => $product->id,
            'customer_name' => 'کاربر',
            'customer_phone' => '09121234567',
            'amount' => 1_000_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $service->syncFromPaidOrders($user);

        $this->assertDatabaseMissing('course_accesses', [
            'user_id' => $user->id,
            'product_id' => $product->id,
        ]);

        AccessSyncCache::forget($user);

        $service->syncFromPaidOrders($user);

        $this->assertDatabaseHas('course_accesses', [
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'active',
        ]);
    }

    public function test_fulfillment_clears_access_sync_cache(): void
    {
        Cache::flush();

        $user = User::factory()->create(['mobile' => '09129876543']);
        $product = Product::create([
            'title' => 'دوره دوم',
            'slug' => 'test-course-2',
            'type' => 'normal',
            'price' => 500_000,
            'is_active' => true,
        ]);

        $service = app(CourseAccessService::class);
        $service->syncFromPaidOrders($user);

        Order::create([
            'order_number' => 'BC-SYNC-2',
            'user_id' => $user->id,
            'product_id' => $product->id,
            'customer_name' => 'کاربر',
            'customer_phone' => '09129876543',
            'amount' => 500_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        AccessSyncCache::forgetUserId($user->id);

        $service->syncFromPaidOrders($user);

        $this->assertTrue(
            CourseAccess::query()
                ->where('user_id', $user->id)
                ->where('product_id', $product->id)
                ->exists()
        );
    }
}
