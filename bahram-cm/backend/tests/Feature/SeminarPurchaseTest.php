<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeminarPurchaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_creation_fails_when_seminar_capacity_is_full(): void
    {
        $product = Product::create([
            'title' => 'سمینار ظرفیت محدود',
            'slug' => 'seminar-capacity-test',
            'type' => 'event',
            'price' => 500000,
            'is_active' => true,
        ]);

        $seminar = Seminar::create([
            'title' => 'سمینار ظرفیت محدود',
            'date' => now()->addWeek(),
            'status' => 'published',
            'product_id' => $product->id,
            'price' => 500000,
            'capacity' => 1,
        ]);

        $user = User::create(['name' => 'اول', 'mobile' => '09121111111', 'status' => 'active']);
        SeminarAttendee::create([
            'seminar_id' => $seminar->id,
            'user_id' => $user->id,
            'attendance_status' => 'registered',
        ]);

        $response = $this->postJson('/api/orders', [
            'product_id' => $product->id,
            'customer_name' => 'دوم',
            'customer_phone' => '09122222222',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonPath('error.code', 'validation_error');
        $response->assertJsonPath('error.details.product_id.0', 'ظرفیت این سمینار تکمیل شده است.');
    }
}
