<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Models\Faq;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FaqAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_can_reorder_faqs(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);

        $first = Faq::create(['question' => 'سوال اول', 'answer' => 'پاسخ اول', 'sort_order' => 1, 'is_active' => true]);
        $second = Faq::create(['question' => 'سوال دوم', 'answer' => 'پاسخ دوم', 'sort_order' => 2, 'is_active' => true]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/faqs/reorder', [
            'items' => [
                ['id' => $second->id, 'sort_order' => 1],
                ['id' => $first->id, 'sort_order' => 2],
            ],
        ])->assertOk();

        $response = $this->getJson('/api/faqs');
        $response->assertOk();
        $questions = collect($response->json('data'))->pluck('question');
        $this->assertSame(['سوال دوم', 'سوال اول'], $questions->all());
    }

    public function test_admin_create_assigns_next_sort_order_when_missing(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);

        Faq::create(['question' => 'قدیمی', 'answer' => 'پاسخ', 'sort_order' => 7, 'is_active' => true]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/faqs', [
            'question' => 'جدید',
            'answer' => 'پاسخ جدید',
            'is_active' => true,
        ]);

        $response->assertCreated();
        $this->assertSame(8, $response->json('data.sort_order'));
    }
}
