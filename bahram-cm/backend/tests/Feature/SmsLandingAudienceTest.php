<?php

namespace Tests\Feature;

use App\Enums\AdminRoleName;
use App\Models\LandingPage;
use App\Models\Lead;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Models\User;
use App\Support\SmsMessage;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SmsCenterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SmsLandingAudienceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->seed(SmsCenterSeeder::class);
    }

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);
        Sanctum::actingAs($admin, ['*']);

        return $admin;
    }

    private function makeLandingPage(string $slug, string $title): LandingPage
    {
        return LandingPage::query()->create([
            'slug' => $slug,
            'title' => $title,
            'is_published' => true,
            'published_at' => now(),
            'form_fields' => ['message' => false, 'email' => false],
        ]);
    }

    private function configureKavenegar(): void
    {
        SmsProvider::query()->where('slug', 'kavenegar')->first()?->update([
            'is_active' => true,
            'credentials' => 'test-kavenegar-key',
            'sender_number' => '10001234',
        ]);

        SmsSetting::current()->update([
            'is_sms_active' => true,
            'primary_provider_slug' => 'kavenegar',
            'sms_provider' => 'kavenegar',
            'sms_api_key' => 'test-kavenegar-key',
            'sms_sender_number' => '10001234',
            'fallback_enabled' => false,
        ]);
    }

    public function test_sms_segments_include_landing_pages_with_correct_counts(): void
    {
        $this->actingAsAdmin();

        $pageA = $this->makeLandingPage('landing-a', 'کمپین الف');
        $pageB = $this->makeLandingPage('landing-b', 'کمپین ب');

        Lead::create(['landing_page_id' => $pageA->id, 'name' => 'کاربر ۱', 'phone' => '09121110001', 'source' => 'web_landing']);
        Lead::create(['landing_page_id' => $pageA->id, 'name' => 'کاربر ۲', 'phone' => '09121110002', 'source' => 'web_landing']);
        // Duplicate (unnormalized) phone should not double-count.
        Lead::create(['landing_page_id' => $pageA->id, 'name' => 'کاربر تکراری', 'phone' => '0912 111 0001', 'source' => 'web_landing']);
        Lead::create(['landing_page_id' => $pageB->id, 'name' => 'کاربر ۳', 'phone' => '09121110003', 'source' => 'web_landing']);
        // Non-landing lead must not be included in any landing segment.
        Lead::create(['landing_page_id' => null, 'name' => 'تماس مستقیم', 'phone' => '09121110004', 'source' => 'web_contact']);

        $response = $this->getJson('/api/v1/sms/segments')->assertOk();
        $segments = collect($response->json('data'));

        $all = $segments->firstWhere('key', 'landing_leads_all');
        $this->assertNotNull($all);
        $this->assertSame(3, $all['count']);

        $segmentA = $segments->firstWhere('key', 'landing:'.$pageA->id);
        $this->assertNotNull($segmentA);
        $this->assertSame(2, $segmentA['count']);
        $this->assertSame('لندینگ «کمپین الف»', $segmentA['label']);

        $segmentB = $segments->firstWhere('key', 'landing:'.$pageB->id);
        $this->assertNotNull($segmentB);
        $this->assertSame(1, $segmentB['count']);
    }

    public function test_bulk_sms_can_be_sent_to_a_single_landing_page_segment(): void
    {
        $this->actingAsAdmin();
        $this->configureKavenegar();

        $pageA = $this->makeLandingPage('landing-a', 'کمپین الف');
        $pageB = $this->makeLandingPage('landing-b', 'کمپین ب');

        Lead::create(['landing_page_id' => $pageA->id, 'name' => 'کاربر ۱', 'phone' => '09121110001', 'source' => 'web_landing']);
        Lead::create(['landing_page_id' => $pageA->id, 'name' => 'کاربر ۲', 'phone' => '09121110002', 'source' => 'web_landing']);
        Lead::create(['landing_page_id' => $pageB->id, 'name' => 'کاربر ۳', 'phone' => '09121110003', 'source' => 'web_landing']);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/sms/send', [
            'message' => 'سلام، این یک پیام تست است. '.SmsMessage::OPT_OUT_SUFFIX,
            'segment' => 'landing:'.$pageA->id,
        ])->assertOk();

        $response->assertJsonPath('data.total', 2);
        $response->assertJsonPath('data.sent', 2);

        Http::assertSentCount(2);
        Http::assertSent(fn ($request) => $request['receptor'] === '09121110001');
        Http::assertSent(fn ($request) => $request['receptor'] === '09121110002');
    }

    public function test_bulk_sms_send_rejects_an_unknown_segment(): void
    {
        $this->actingAsAdmin();
        $this->configureKavenegar();

        $this->postJson('/api/v1/sms/send', [
            'message' => 'سلام، این یک پیام تست است. '.SmsMessage::OPT_OUT_SUFFIX,
            'segment' => 'landing:999999',
        ])->assertUnprocessable();
    }
}
