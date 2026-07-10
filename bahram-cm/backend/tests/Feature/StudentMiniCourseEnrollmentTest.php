<?php

namespace Tests\Feature;

use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentMiniCourseEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_enroll_in_free_mini_course(): void
    {
        $user = User::factory()->create(['mobile' => '09121112233']);

        $course = MiniCourse::create([
            'slug' => 'alfabe-kampain-nevisi',
            'title' => 'الفبای کمپین‌نویسی',
            'aparat_hash' => 'testhash',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/student/mini-courses/'.$course->slug.'/enroll');

        $response->assertOk()
            ->assertJsonPath('data.slug', $course->slug)
            ->assertJsonPath('data.already_enrolled', false);

        $orderNumber = $response->json('data.order_number');
        $this->assertIsString($orderNumber);
        $this->assertStringStartsWith('BC-', $orderNumber);

        $this->assertDatabaseHas('mini_course_enrollments', [
            'user_id' => $user->id,
            'mini_course_id' => $course->id,
        ]);

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'order_number' => $orderNumber,
            'final_amount' => 0,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
        ]);

        $course->refresh();
        $this->assertNotNull($course->product_id);

        $this->assertDatabaseHas('notifications', [
            'type' => 'mini_course_enrolled',
            'link' => '/panel/mini-courses/'.$course->slug.'/watch',
        ]);
        $this->assertDatabaseHas('notification_recipients', [
            'user_id' => $user->id,
            'read_at' => null,
        ]);
    }

    public function test_enroll_is_idempotent(): void
    {
        $user = User::factory()->create(['mobile' => '09124445566']);

        $course = MiniCourse::create([
            'slug' => 'senario-nevisi',
            'title' => 'سناریونویسی',
            'aparat_hash' => 'hash2',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/student/mini-courses/'.$course->slug.'/enroll')
            ->assertOk();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/student/mini-courses/'.$course->slug.'/enroll');

        $response->assertOk()->assertJsonPath('data.already_enrolled', true);
        $this->assertSame(1, MiniCourseEnrollment::query()->count());
        $this->assertSame(1, Order::query()->count());
        $this->assertSame(1, \App\Models\Notification::query()->count());
    }

    public function test_enrolled_mini_course_appears_in_student_courses_and_orders(): void
    {
        $user = User::factory()->create(['mobile' => '09127778899']);

        $course = MiniCourse::create([
            'slug' => 'mini-test',
            'title' => 'مینی دوره تست',
            'aparat_hash' => 'hash3',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        app(\App\Services\MiniCourseProductService::class)->syncProduct($course);
        $course->refresh();

        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'BC-260710-TEST1',
            'product_id' => $course->product_id,
            'customer_name' => 'کاربر',
            'customer_phone' => '09127778899',
            'amount' => 0,
            'discount_amount' => 0,
            'final_amount' => 0,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        MiniCourseEnrollment::create([
            'mini_course_id' => $course->id,
            'user_id' => $user->id,
            'order_id' => $order->id,
            'enrollment_number' => $order->order_number,
            'enrolled_at' => now(),
        ]);

        $coursesResponse = $this->actingAs($user, 'sanctum')->getJson('/api/v1/student/courses');
        $coursesResponse->assertOk()->assertJsonCount(1, 'data');
        $coursesResponse->assertJsonPath('data.0.course_type', 'mini');
        $coursesResponse->assertJsonPath('data.0.product.title', 'مینی دوره تست');
        $coursesResponse->assertJsonPath('data.0.order_number', 'BC-260710-TEST1');

        $ordersResponse = $this->actingAs($user, 'sanctum')->getJson('/api/v1/student/orders');
        $ordersResponse->assertOk();
        $ordersResponse->assertJsonPath('data.0.order_number', 'BC-260710-TEST1');
        $ordersResponse->assertJsonPath('data.0.final_amount', 0);
    }

    public function test_player_requires_enrollment(): void
    {
        $user = User::factory()->create(['mobile' => '09120001122']);

        $course = MiniCourse::create([
            'slug' => 'locked-mini',
            'title' => 'مینی قفل',
            'aparat_hash' => 'secret-hash',
            'is_active' => true,
            'sort_order' => 4,
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/student/mini-courses/'.$course->slug.'/player')
            ->assertNotFound();

        app(\App\Services\MiniCourseEnrollmentService::class)->enroll($user, $course);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/student/mini-courses/'.$course->slug.'/player')
            ->assertOk()
            ->assertJsonPath('data.aparat_hash', 'secret-hash');
    }

    public function test_public_mini_course_payload_hides_video_hash(): void
    {
        MiniCourse::create([
            'slug' => 'public-mini',
            'title' => 'عمومی',
            'aparat_hash' => 'hidden-hash',
            'is_active' => true,
            'sort_order' => 5,
        ]);

        $response = $this->getJson('/api/mini-courses/public-mini');

        $response->assertOk();
        $response->assertJsonMissing(['aparat_hash' => 'hidden-hash']);
        $this->assertArrayNotHasKey('aparat_hash', $response->json('data') ?? []);
    }
}
