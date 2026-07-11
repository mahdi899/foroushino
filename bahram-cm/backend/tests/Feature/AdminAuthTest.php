<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\CaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_auth_me_returns_401_when_unauthenticated(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_admin_login_rejects_wrong_captcha_even_when_ip_is_trusted(): void
    {
        Setting::query()->updateOrCreate(
            ['group' => 'captcha', 'key' => 'config'],
            ['value' => [
                'enabled' => true,
                'honeypot_enabled' => true,
                'protect_admin_login' => true,
            ]],
        );
        CaptchaService::forgetCachedConfig();

        User::factory()->create([
            'email' => 'admin@bahram.local',
            'mobile' => '09121000001',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);

        /** @var CaptchaService $captcha */
        $captcha = app(CaptchaService::class);
        $challenge = $captcha->createMathChallenge();
        $captcha->markTrusted('127.0.0.1');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@bahram.local',
            'password' => 'password',
            'captcha_id' => $challenge['id'],
            'captcha_answer' => '999',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('error.details.captcha.0', 'تأیید امنیتی ناموفق بود. لطفاً دوباره تلاش کنید.');
    }

    public function test_admin_login_is_limited_to_three_attempts_per_hour(): void
    {
        Setting::query()->updateOrCreate(
            ['group' => 'captcha', 'key' => 'config'],
            ['value' => [
                'enabled' => false,
                'protect_admin_login' => false,
            ]],
        );
        CaptchaService::forgetCachedConfig();

        User::factory()->create([
            'email' => 'admin@bahram.local',
            'mobile' => '09121000001',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'admin@bahram.local',
                'password' => 'wrong-password',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@bahram.local',
            'password' => 'wrong-password',
        ])
            ->assertStatus(429)
            ->assertJsonPath(
                'error.message_fa',
                'حداکثر ۳ بار در هر ساعت می‌توانید وارد شوید. لطفاً بعداً دوباره تلاش کنید.',
            );
    }

    public function test_admin_login_accepts_valid_math_captcha(): void
    {
        Setting::query()->updateOrCreate(
            ['group' => 'captcha', 'key' => 'config'],
            ['value' => [
                'enabled' => true,
                'site_key' => 'test-site-key',
                'secret_key' => '',
                'protect_admin_login' => true,
            ]],
        );
        CaptchaService::forgetCachedConfig();

        config(['bahram.otp.dev_mode' => true, 'bahram.otp.dev_code' => '12345']);

        User::factory()->create([
            'email' => 'admin@bahram.local',
            'mobile' => '09121000001',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);

        /** @var CaptchaService $captcha */
        $captcha = app(CaptchaService::class);
        $challenge = $captcha->createMathChallenge();
        $answer = Cache::get('captcha:math:'.$challenge['id']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@bahram.local',
            'password' => 'password',
            'captcha_id' => $challenge['id'],
            'captcha_answer' => (string) $answer,
            'captcha_token' => 'invalid-recaptcha-token',
        ])
            ->assertOk()
            ->assertJsonPath('data.otp_required', true);
    }

    public function test_admin_send_otp_requires_password_step_first(): void
    {
        Setting::query()->updateOrCreate(
            ['group' => 'captcha', 'key' => 'config'],
            ['value' => [
                'enabled' => false,
                'protect_admin_login' => false,
            ]],
        );
        CaptchaService::forgetCachedConfig();

        User::factory()->create([
            'email' => 'admin@bahram.local',
            'mobile' => '09121000001',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);

        $this->postJson('/api/v1/auth/send-otp', [
            'mobile' => '09121000001',
        ])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'login_required');
    }

    public function test_admin_password_login_sends_otp_to_registered_mobile(): void
    {
        Setting::query()->updateOrCreate(
            ['group' => 'captcha', 'key' => 'config'],
            ['value' => [
                'enabled' => false,
                'protect_admin_login' => false,
            ]],
        );
        CaptchaService::forgetCachedConfig();

        config(['bahram.otp.dev_mode' => true, 'bahram.otp.dev_code' => '12345']);

        User::factory()->create([
            'email' => 'admin@bahram.local',
            'mobile' => '09121000001',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@bahram.local',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('data.otp_required', true)
            ->assertJsonPath('data.mobile', '09121000001')
            ->assertJsonMissing(['token']);
    }

    public function test_admin_otp_login_issues_token_after_password_step(): void
    {
        Setting::query()->updateOrCreate(
            ['group' => 'captcha', 'key' => 'config'],
            ['value' => [
                'enabled' => false,
                'protect_admin_login' => false,
            ]],
        );
        CaptchaService::forgetCachedConfig();

        config(['bahram.otp.dev_mode' => true, 'bahram.otp.dev_code' => '12345']);

        User::factory()->create([
            'email' => 'admin@bahram.local',
            'mobile' => '09121000001',
            'password' => Hash::make('password'),
            'is_admin' => true,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@bahram.local',
            'password' => 'password',
        ])->assertOk();

        $this->postJson('/api/v1/auth/verify-otp', [
            'mobile' => '09121000001',
            'code' => '12345',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'data' => ['id', 'email', 'mobile', 'roles']]);
    }
}
