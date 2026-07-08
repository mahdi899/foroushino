<?php

namespace Tests\Feature;

use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentCoursesListTest extends TestCase
{
    use RefreshDatabase;

    public function test_courses_index_lists_all_purchased_products(): void
    {
        $user = User::factory()->create(['mobile' => '09121234567']);

        $courseA = Product::create([
            'title' => 'دوره الف',
            'slug' => 'course-a',
            'type' => 'normal',
            'price' => 1_000_000,
            'is_active' => true,
        ]);

        $courseB = Product::create([
            'title' => 'دوره ب',
            'slug' => 'course-b',
            'type' => 'normal',
            'price' => 2_000_000,
            'is_active' => true,
        ]);

        CourseAccess::create([
            'user_id' => $user->id,
            'product_id' => $courseA->id,
            'status' => 'active',
            'access_type' => 'lifetime',
            'source' => 'zarinpal',
            'activated_at' => now()->subDay(),
        ]);

        Order::create([
            'order_number' => 'BC-1002',
            'user_id' => $user->id,
            'product_id' => $courseB->id,
            'customer_name' => 'کاربر',
            'customer_phone' => '09121234567',
            'amount' => 2_000_000,
            'discount_amount' => 0,
            'final_amount' => 2_000_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/student/courses');

        $response->assertOk()->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.product.title', 'دوره ب');
        $response->assertJsonPath('data.0.order_number', 'BC-1002');
        $response->assertJsonPath('data.1.product.title', 'دوره الف');
        $response->assertJsonPath('data.0.pending_activation', false);
        $response->assertJsonPath('data.1.pending_activation', false);
    }

    public function test_courses_index_syncs_missing_access_from_paid_orders(): void
    {
        $user = User::factory()->create(['mobile' => '09123334455']);

        $courseA = Product::create([
            'title' => 'دوره اسپات ۱',
            'slug' => 'spot-course-1',
            'type' => 'normal',
            'price' => 1_000_000,
            'spotplayer_course_id' => 'course-spot-1',
            'is_active' => true,
        ]);

        $courseB = Product::create([
            'title' => 'دوره اسپات ۲',
            'slug' => 'spot-course-2',
            'type' => 'normal',
            'price' => 2_000_000,
            'spotplayer_course_id' => 'course-spot-2',
            'is_active' => true,
        ]);

        CourseAccess::create([
            'user_id' => $user->id,
            'product_id' => $courseA->id,
            'status' => 'active',
            'access_type' => 'lifetime',
            'source' => 'zarinpal',
            'activated_at' => now()->subDays(2),
        ]);

        Order::create([
            'order_number' => 'BC-2001',
            'user_id' => $user->id,
            'product_id' => $courseB->id,
            'customer_name' => 'کاربر',
            'customer_phone' => '09123334455',
            'amount' => 2_000_000,
            'discount_amount' => 0,
            'final_amount' => 2_000_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/student/courses');

        $response->assertOk()->assertJsonCount(2, 'data');
        $this->assertDatabaseHas('course_accesses', [
            'user_id' => $user->id,
            'product_id' => $courseB->id,
            'status' => 'active',
        ]);
        $response->assertJsonPath('data.0.product.title', 'دوره اسپات ۲');
        $response->assertJsonPath('data.1.product.title', 'دوره اسپات ۱');
    }

    public function test_courses_index_lists_each_spotplayer_license_separately(): void
    {
        $user = User::factory()->create(['mobile' => '09125556677']);

        $product = Product::create([
            'title' => 'دوره کمپین‌نویسی',
            'slug' => 'campaign',
            'type' => 'normal',
            'price' => 1_000_000,
            'spotplayer_course_id' => 'spot-course-1',
            'is_active' => true,
        ]);

        $access = CourseAccess::create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'active',
            'access_type' => 'lifetime',
            'source' => 'zarinpal',
            'activated_at' => now(),
        ]);

        foreach (['BC-A', 'BC-B', 'BC-C'] as $index => $orderNumber) {
            $order = Order::create([
                'order_number' => $orderNumber,
                'user_id' => $user->id,
                'product_id' => $product->id,
                'customer_name' => 'کاربر',
                'customer_phone' => '09125556677',
                'amount' => 1_000_000,
                'discount_amount' => 0,
                'final_amount' => 1_000_000,
                'status' => 'fulfilled',
                'payment_status' => 'paid',
                'paid_at' => now()->subDays(3 - $index),
            ]);

            \App\Models\SpotplayerLicense::create([
                'user_id' => $user->id,
                'product_id' => $product->id,
                'order_id' => $order->id,
                'course_access_id' => $access->id,
                'spotplayer_course_id' => 'spot-course-1',
                'license_key' => 'license-key-'.$orderNumber,
                'status' => 'active',
            ]);
        }

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/student/courses');

        $response->assertOk()->assertJsonCount(3, 'data');
        $response->assertJsonPath('data.0.order_number', 'BC-C');
        $response->assertJsonPath('data.1.order_number', 'BC-B');
        $response->assertJsonPath('data.2.order_number', 'BC-A');
        $this->assertStringStartsWith('license-', $response->json('data.0.list_key'));
    }
}
