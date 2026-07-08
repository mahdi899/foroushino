<?php

namespace Tests\Feature;

use App\Models\SmsEventConfig;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Services\SmsService;
use Database\Seeders\SmsCenterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BaleSafirProviderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SmsCenterSeeder::class);
    }

    private function configureBaleSafir(): void
    {
        SmsProvider::query()->where('slug', 'bale_safir')->first()?->update([
            'is_active' => true,
            'credentials' => 'test-safir-api-key',
            'sender_number' => '123456789',
        ]);

        SmsSetting::current()->update([
            'is_sms_active' => true,
            'primary_provider_slug' => 'kavenegar',
            'fallback_enabled' => false,
        ]);

        SmsEventConfig::forKey('otp')?->update([
            'is_enabled' => true,
            'fallback_enabled' => false,
        ]);
    }

    public function test_otp_is_sent_via_bale_safir_with_otp_message_payload(): void
    {
        $this->configureBaleSafir();

        Http::fake([
            'safir.bale.ai/*' => Http::response([
                'message_id' => 'BvQjaR.fIKt7kH.EXTddgYduJ2',
            ], 200),
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 400, 'message' => 'fail'],
            ], 200),
        ]);

        $sent = app(SmsService::class)->sendOtp('09121112233', '54321');

        $this->assertTrue($sent);
        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), 'safir.bale.ai/api/v3/send_message')) {
                return false;
            }

            return $request->hasHeader('api-access-key', 'test-safir-api-key')
                && $request['bot_id'] === 123456789
                && $request['phone_number'] === '989121112233'
                && data_get($request->data(), 'message_data.otp_message.otp') === '54321';
        });
    }

    public function test_bale_safir_send_fails_without_bot_id(): void
    {
        SmsProvider::query()->where('slug', 'bale_safir')->first()?->update([
            'is_active' => true,
            'credentials' => 'test-safir-api-key',
            'sender_number' => null,
        ]);

        SmsSetting::current()->update([
            'is_sms_active' => false,
            'fallback_enabled' => false,
        ]);

        Http::fake();

        $sent = app(SmsService::class)->sendOtp('09121112233', '54321');

        $this->assertFalse($sent);
        Http::assertNothingSent();
    }

    public function test_student_can_request_active_otp_via_bale_safir_endpoint(): void
    {
        $this->configureBaleSafir();
        config(['bahram.otp.dev_mode' => false]);

        Http::fake([
            'safir.bale.ai/*' => Http::response(['message_id' => 'BvQjaR.fIKt7kH.EXTddgYduJ2'], 200),
            'api.kavenegar.com/*' => Http::response(['return' => ['status' => 200, 'message' => 'ok']], 200),
        ]);

        $this->postJson('/api/v1/student/auth/send-otp', ['mobile' => '09121112233'])
            ->assertOk();

        $response = $this->postJson('/api/v1/student/auth/send-otp-bale', ['mobile' => '09121112233']);

        $response->assertOk()
            ->assertJsonPath('data.channel', 'bale_safir');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'safir.bale.ai/api/v3/send_message'));
    }
}
