<?php

namespace Tests\Feature;

use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
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

        $this->assertDatabaseHas('mini_course_enrollments', [
            'user_id' => $user->id,
            'mini_course_id' => $course->id,
        ]);

        $enrollmentNumber = $response->json('data.enrollment_number');
        $this->assertIsString($enrollmentNumber);
        $this->assertStringStartsWith('MC-', $enrollmentNumber);
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
    }

    public function test_enrolled_mini_course_appears_in_student_courses_list(): void
    {
        $user = User::factory()->create(['mobile' => '09127778899']);

        $course = MiniCourse::create([
            'slug' => 'mini-test',
            'title' => 'مینی دوره تست',
            'aparat_hash' => 'hash3',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        MiniCourseEnrollment::create([
            'mini_course_id' => $course->id,
            'user_id' => $user->id,
            'enrollment_number' => 'MC-260710-TEST1',
            'enrolled_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/student/courses');

        $response->assertOk()->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.course_type', 'mini');
        $response->assertJsonPath('data.0.product.title', 'مینی دوره تست');
        $response->assertJsonPath('data.0.order_number', 'MC-260710-TEST1');
        $response->assertJsonPath('data.0.is_active', true);
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

        MiniCourseEnrollment::create([
            'mini_course_id' => $course->id,
            'user_id' => $user->id,
            'enrollment_number' => 'MC-260710-LOCK1',
            'enrolled_at' => now(),
        ]);

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
