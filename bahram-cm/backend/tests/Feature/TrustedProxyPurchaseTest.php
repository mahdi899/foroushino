<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class TrustedProxyPurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function product(): Product
    {
        return Product::create([
            'title' => 'محصول پروکسی',
            'slug' => 'proxy-'.uniqid(),
            'type' => 'normal',
            'price' => 100000,
            'is_active' => true,
        ]);
    }

    public function test_trusted_loopback_honors_x_forwarded_for_as_client_ip(): void
    {
        $seenIp = null;

        $this->app['router']->get('/__test/client-ip', function (Request $request) use (&$seenIp) {
            $seenIp = $request->ip();

            return response()->json(['ip' => $request->ip()]);
        });

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders([
                'X-Forwarded-For' => '203.0.113.10',
                'X-Real-IP' => '203.0.113.10',
            ])
            ->getJson('/__test/client-ip')
            ->assertOk()
            ->assertJsonPath('ip', '203.0.113.10');

        $this->assertSame('203.0.113.10', $seenIp);
    }

    public function test_untrusted_client_cannot_spoof_x_forwarded_for(): void
    {
        $this->app['router']->get('/__test/client-ip-spoof', function (Request $request) {
            return response()->json(['ip' => $request->ip()]);
        });

        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.20'])
            ->withHeaders([
                'X-Forwarded-For' => '203.0.113.99',
            ])
            ->getJson('/__test/client-ip-spoof')
            ->assertOk()
            ->assertJsonPath('ip', '198.51.100.20');
    }

    public function test_order_route_uses_forwarded_ip_for_rate_limit_bucket(): void
    {
        config([
            'bahram.purchase_rate_limits.order_per_minute' => 1,
            'bahram.purchase_rate_limits.global_per_minute' => 3000,
        ]);

        $product = $this->product();
        $payload = [
            'product_id' => $product->id,
            'customer_name' => 'پروکسی',
            'customer_phone' => '09126660001',
        ];

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.10'])
            ->postJson('/api/orders', $payload)
            ->assertCreated();

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.10'])
            ->postJson('/api/orders', $payload)
            ->assertStatus(429);

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.11'])
            ->postJson('/api/orders', [
                'product_id' => $product->id,
                'customer_name' => 'پروکسی دو',
                'customer_phone' => '09126660002',
            ])
            ->assertCreated();
    }
}
