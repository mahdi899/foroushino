<?php

namespace Tests\Feature;

use App\Models\CourseAccess;
use App\Models\Product;
use App\Models\SpotplayerLicense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentCoursePlayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_returns_spotplayer_payload_for_active_access(): void
    {
        $user = User::factory()->create(['mobile' => '09121234567']);

        $product = Product::create([
            'title' => 'دوره کمپین‌نویسی',
            'slug' => 'campaign-writing',
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

        SpotplayerLicense::create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'course_access_id' => $access->id,
            'spotplayer_course_id' => 'spot-course-1',
            'license_key' => 'license-key-001',
            'license_url' => 'https://dl.spotplayer.ir/license/demo123',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/student/courses/'.$access->id.'/player');

        $response->assertOk()
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.license_key', 'license-key-001')
            ->assertJsonPath('data.spotplayer_course_id', 'spot-course-1')
            ->assertJsonPath('data.license_script_url', 'https://dl.spotplayer.ir/license/demo123?f=js');
    }

    public function test_player_rejects_foreign_access(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'course-x',
            'type' => 'normal',
            'price' => 1_000_000,
            'is_active' => true,
        ]);

        $access = CourseAccess::create([
            'user_id' => $owner->id,
            'product_id' => $product->id,
            'status' => 'active',
            'access_type' => 'lifetime',
            'source' => 'zarinpal',
            'activated_at' => now(),
        ]);

        $this->actingAs($other, 'sanctum')
            ->getJson('/api/v1/student/courses/'.$access->id.'/player')
            ->assertNotFound();
    }
}
