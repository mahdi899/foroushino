<?php

namespace Tests\Feature;

use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FreeMiniCourseCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_logged_in_student_can_complete_free_mini_course_checkout(): void
    {
        $user = User::factory()->create(['mobile' => '09123334455']);

        $course = MiniCourse::create([
            'slug' => 'alfabe-kampain-nevisi',
            'title' => 'الفبای کمپین‌نویسی',
            'aparat_hash' => 'testhash',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        app(\App\Services\MiniCourseProductService::class)->syncProduct($course);
        $course->refresh();

        $orderResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', [
                'product_id' => $course->product_id,
                'customer_name' => 'کاربر تست',
                'customer_phone' => $user->mobile,
            ]);

        $orderResponse->assertCreated();
        $orderId = $orderResponse->json('data.id');

        $paymentResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/payments/zarinpal/request', [
                'order_id' => $orderId,
            ]);

        $paymentResponse->assertOk()
            ->assertJsonPath('data.order_number', fn ($value) => is_string($value) && str_starts_with($value, 'BC-'));

        $paymentUrl = $paymentResponse->json('data.payment_url');
        $this->assertIsString($paymentUrl);
        $this->assertStringContainsString('/payment/result?token=', $paymentUrl);

        $this->assertDatabaseHas('mini_course_enrollments', [
            'user_id' => $user->id,
            'mini_course_id' => $course->id,
        ]);

        $this->assertSame(1, MiniCourseEnrollment::query()->count());
    }
}
