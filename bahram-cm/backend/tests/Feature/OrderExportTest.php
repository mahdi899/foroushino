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

class OrderExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_can_export_orders_as_xlsx(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'export-'.uniqid(),
            'type' => 'normal',
            'price' => 500_000,
            'is_active' => true,
        ]);

        Order::create([
            'order_number' => 'BC-EXPORT-1',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09121234567',
            'amount' => 500_000,
            'discount_amount' => 0,
            'final_amount' => 500_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $response = $this->get('/api/v1/panel/orders/export');

        $response->assertOk();
        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        $this->assertStringContainsString('.xlsx', (string) $response->headers->get('Content-Disposition'));
        $this->assertGreaterThan(1000, (int) $response->headers->get('Content-Length'));
    }
}
