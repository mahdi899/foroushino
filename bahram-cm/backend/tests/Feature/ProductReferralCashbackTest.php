<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductReferralCashbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_fixed_cashback_from_product(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 2_000_000,
            'referral_cashback_enabled' => true,
            'referral_cashback_type' => 'fixed',
            'referral_cashback_value' => 500_000,
            'is_active' => true,
        ]);

        $this->assertSame(500_000, $product->computeReferralCashback(1_990_000));
    }

    public function test_percent_cashback_from_product(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 2_000_000,
            'referral_cashback_enabled' => true,
            'referral_cashback_type' => 'percent',
            'referral_cashback_value' => 10,
            'is_active' => true,
        ]);

        $this->assertSame(199_000, $product->computeReferralCashback(1_990_000));
    }

    public function test_disabled_cashback_returns_zero(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 2_000_000,
            'referral_cashback_enabled' => false,
            'is_active' => true,
        ]);

        $this->assertSame(0, $product->computeReferralCashback(1_990_000));
    }

    public function test_referral_link_is_global(): void
    {
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->getJson('/api/v1/student/referrals');

        $response->assertOk();
        $link = $response->json('data.link');
        $this->assertStringContainsString('/?ref=', $link);
        $this->assertStringNotContainsString('/purchase/', $link);
    }

    public function test_active_cashback_products_listed_in_referrals_api(): void
    {
        Product::create([
            'title' => 'دوره کمپین',
            'slug' => 'campaign-writing',
            'type' => 'normal',
            'price' => 2_500_000,
            'referral_cashback_enabled' => true,
            'referral_cashback_type' => 'fixed',
            'referral_cashback_value' => 2_000_000,
            'is_active' => true,
        ]);

        $user = \App\Models\User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/v1/student/referrals')
            ->assertOk()
            ->assertJsonPath('data.cashback_products.0.slug', 'campaign-writing')
            ->assertJsonPath('data.cashback_products.0.label', '2,000,000 تومان');
    }
}
