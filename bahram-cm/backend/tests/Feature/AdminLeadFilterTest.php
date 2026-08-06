<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Models\LandingPage;
use App\Models\Lead;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminLeadFilterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_landing_filter_returns_web_landing_leads(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        $page = LandingPage::query()->create([
            'slug' => 'summer-campaign',
            'title' => 'کمپین تابستان',
            'is_published' => true,
            'published_at' => now(),
            'form_fields' => ['message' => false, 'email' => false],
        ]);

        $landingLead = Lead::create([
            'landing_page_id' => $page->id,
            'name' => 'لید لندینگ',
            'phone' => '09121112233',
            'source' => 'web_landing',
        ]);

        Lead::create([
            'name' => 'تماس سایت',
            'phone' => '09124445566',
            'source' => 'web_contact',
        ]);

        $response = $this->getJson('/api/v1/leads?filter[form_type]=landing');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame([$landingLead->id], $ids);
        $response->assertJsonPath('data.0.landing_page.title', 'کمپین تابستان');
    }

    public function test_nested_filter_array_does_not_break_landing_filter(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        $page = LandingPage::query()->create([
            'slug' => 'promo',
            'title' => '۱۲۳',
            'is_published' => true,
            'published_at' => now(),
            'form_fields' => ['message' => false, 'email' => false],
        ]);

        $landingLead = Lead::create([
            'landing_page_id' => $page->id,
            'name' => 'نتنمت',
            'phone' => '09145416413',
            'source' => 'web_landing',
        ]);

        // Simulates adminFetch query string: filter[form_type]=landing
        $response = $this->call(
            'GET',
            '/api/v1/leads',
            ['filter' => ['form_type' => 'landing'], 'per_page' => 100],
            [],
            [],
            ['HTTP_ACCEPT' => 'application/json'],
        );

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame([$landingLead->id], $ids);
    }

    public function test_contact_filter_returns_web_contact_leads(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        $contactLead = Lead::create([
            'name' => 'تماس',
            'phone' => '09123334455',
            'source' => 'web_contact',
        ]);

        Lead::create([
            'name' => 'لندینگ',
            'phone' => '09126667788',
            'source' => 'web_landing',
        ]);

        $response = $this->getJson('/api/v1/leads?filter[form_type]=contact');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertSame([$contactLead->id], $ids);
    }
}
