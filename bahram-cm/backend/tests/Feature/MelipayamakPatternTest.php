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

class MelipayamakPatternTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SmsCenterSeeder::class);
    }

    public function test_otp_pattern_sends_only_variable_values_to_melipayamak(): void
    {
        SmsProvider::query()->where('slug', 'melipayamak')->first()?->update([
            'is_active' => true,
            'credentials' => 'demo-user:demo-pass',
            'sender_number' => '5000xxx',
        ]);

        SmsSetting::current()->update([
            'is_sms_active' => true,
            'primary_provider_slug' => 'melipayamak',
            'fallback_enabled' => false,
        ]);

        SmsEventConfig::forKey('otp')?->update([
            'is_enabled' => true,
            'use_pattern' => true,
            'pattern_code' => '123456',
            'fallback_enabled' => false,
        ]);

        Http::fake([
            'rest.payamak-panel.com/*' => Http::response(['RetStatus' => 1], 200),
        ]);

        $sent = app(SmsService::class)->sendOtp('09121112233', '54321');

        $this->assertTrue($sent);
        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), 'rest.payamak-panel.com/api/SendSMS/BaseServiceNumber')) {
                return false;
            }

            return $request['username'] === 'demo-user'
                && $request['password'] === 'demo-pass'
                && $request['to'] === '09121112233'
                && (int) $request['bodyId'] === 123456
                && $request['text'] === '54321';
        });
    }
}
