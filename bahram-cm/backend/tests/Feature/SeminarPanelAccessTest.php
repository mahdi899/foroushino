<?php

namespace Tests\Feature;

use App\Models\CourseAccess;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seminar;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeminarPanelAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_seminar_purchase_appears_in_seminars_not_courses(): void
    {
        $user = User::create([
            'name' => 'شرکت‌کننده',
            'mobile' => '09129998877',
            'status' => 'active',
        ]);

        $product = Product::create([
            'title' => 'سمینار فروش',
            'slug' => 'seminar-sales',
            'type' => 'event',
            'price' => 800000,
            'is_active' => true,
        ]);

        $seminar = Seminar::create([
            'title' => 'سمینار فروش',
            'date' => now()->addWeek(),
            'status' => 'published',
            'product_id' => $product->id,
            'price' => 800000,
        ]);

        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'BC-TEST-SEMINAR',
            'product_id' => $product->id,
            'customer_name' => $user->name,
            'customer_phone' => $user->mobile,
            'amount' => 800000,
            'discount_amount' => 0,
            'final_amount' => 800000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        CourseAccess::create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'order_id' => $order->id,
            'status' => 'active',
            'access_type' => 'lifetime',
            'source' => 'zarinpal',
            'activated_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/student/courses')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/student/seminars')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $seminar->id)
            ->assertJsonPath('data.0.title', 'سمینار فروش');

        $this->getJson("/api/v1/student/seminars/{$seminar->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $seminar->id)
            ->assertJsonPath('data.title', 'سمینار فروش')
            ->assertJsonPath('data.assets', [])
            ->assertJsonPath('data.certificates', []);
    }

    public function test_student_seminar_show_rejects_non_attendee(): void
    {
        $owner = User::create([
            'name' => 'صاحب',
            'mobile' => '09121112233',
            'status' => 'active',
        ]);

        $outsider = User::create([
            'name' => 'غریبه',
            'mobile' => '09123334455',
            'status' => 'active',
        ]);

        $seminar = Seminar::create([
            'title' => 'سمینار خصوصی',
            'date' => now()->addWeek(),
            'status' => 'published',
            'price' => 0,
        ]);

        $seminar->attendees()->create([
            'user_id' => $owner->id,
            'attendance_status' => 'registered',
        ]);

        Sanctum::actingAs($outsider);

        $this->getJson("/api/v1/student/seminars/{$seminar->id}")
            ->assertNotFound();
    }
}
