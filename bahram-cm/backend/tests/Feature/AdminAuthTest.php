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
}
