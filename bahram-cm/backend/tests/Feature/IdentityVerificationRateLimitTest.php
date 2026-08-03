<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IdentityVerificationRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        RateLimiter::clear('identity-draft');
        RateLimiter::clear('identity-upload');
        RateLimiter::clear('identity-submit');
    }

    public function test_identity_draft_is_rate_limited_per_user(): void
    {
        config(['bahram.identity.rate_limits.draft_per_minute' => 3]);

        $user = User::factory()->create(['is_admin' => false]);
        Sanctum::actingAs($user);

        $payload = [
            'first_name' => 'علی',
            'last_name' => 'تست',
            'national_code' => '0010350829',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
        ];

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/student/identity-verification/draft', $payload)
                ->assertOk();
        }

        $this->postJson('/api/v1/student/identity-verification/draft', $payload)
            ->assertStatus(429);
    }

    public function test_identity_upload_is_rate_limited_per_user(): void
    {
        config(['bahram.identity.rate_limits.upload_per_minute' => 2]);

        $user = User::factory()->create(['is_admin' => false]);
        Sanctum::actingAs($user);

        $draft = $this->postJson('/api/v1/student/identity-verification/draft', [
            'first_name' => 'علی',
            'last_name' => 'تست',
            'national_code' => '0010350829',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'city' => 'تهران',
        ])->assertOk()->json('data.id');

        $file = UploadedFile::fake()->image('card.jpg');

        for ($i = 0; $i < 2; $i++) {
            $this->post('/api/v1/student/identity-verification/artifacts', [
                'type' => 'national_card_front',
                'file' => UploadedFile::fake()->image("card-{$i}.jpg"),
                'submission_id' => $draft,
            ])->assertSuccessful();
        }

        $this->post('/api/v1/student/identity-verification/artifacts', [
            'type' => 'national_card_front',
            'file' => $file,
            'submission_id' => $draft,
        ])->assertStatus(429);
    }
}
