<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\CaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class LeadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Avoid cross-test rate-limit bleed (RateLimiter uses the cache store, which persists across tests).
        Cache::flush();
        $this->disableCaptchaForTests();
    }

    private function disableCaptchaForTests(): void
    {
        Setting::query()->updateOrCreate(
            ['group' => 'captcha', 'key' => 'config'],
            ['value' => ['enabled' => false, 'honeypot_enabled' => true]],
        );
        CaptchaService::forgetCachedConfig();
    }

    public function test_a_lead_can_be_created_via_the_public_api(): void
    {
        $response = $this->postJson('/api/leads', [
            'name' => 'علی محمدی',
            'phone' => '09123456789',
            'email' => 'ali@example.com',
            'message' => 'سلام، می‌خواهم بیشتر بدانم.',
            'source' => 'web_apply',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'new');

        $this->assertDatabaseHas('leads', [
            'phone' => '09123456789',
            'email' => 'ali@example.com',
            'source' => 'web_apply',
            'status' => 'new',
        ]);
    }

    public function test_lead_creation_fails_without_any_identifying_field(): void
    {
        $response = $this->postJson('/api/leads', [
            'message' => 'فقط یک پیام بدون هیچ راه ارتباطی.',
        ]);

        $response->assertUnprocessable();
    }

    public function test_lead_honeypot_field_rejects_bots(): void
    {
        $response = $this->postJson('/api/leads', [
            'name' => 'ربات اسپم',
            'phone' => '09120000000',
            'website' => 'http://spam.example.com',
        ]);

        $response->assertUnprocessable();
        $this->assertDatabaseMissing('leads', ['phone' => '09120000000']);
    }

    public function test_newsletter_style_lead_with_email_only_is_accepted(): void
    {
        $response = $this->postJson('/api/leads', [
            'email' => 'newsletter@example.com',
            'source' => 'web_newsletter',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('leads', [
            'email' => 'newsletter@example.com',
            'source' => 'web_newsletter',
        ]);
    }

    public function test_landing_lead_rejects_duplicate_phone_on_same_page(): void
    {
        $page = \App\Models\LandingPage::query()->create([
            'slug' => 'test-landing',
            'title' => 'لندینگ تست',
            'is_published' => true,
            'published_at' => now(),
            'form_fields' => ['message' => false, 'email' => false],
        ]);

        $this->postJson('/api/leads', [
            'name' => 'علی',
            'phone' => '09123456789',
            'landing_slug' => $page->slug,
        ])->assertCreated();

        $this->postJson('/api/leads', [
            'name' => 'رضا',
            'phone' => '0912 345 6789',
            'landing_slug' => $page->slug,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error.message_fa', 'این شماره قبلاً در این صفحه ثبت شده است.');

        $this->assertSame(1, \App\Models\Lead::query()->where('landing_page_id', $page->id)->count());
    }
}
