<?php

namespace Tests\Unit;

use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityProviderConfig;
use App\Services\Identity\Providers\ApiIrShahkarProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ApiIrShahkarProviderTest extends TestCase
{
    use RefreshDatabase;

    private ApiIrShahkarProvider $provider;

    protected function setUp(): void
    {
        parent::setUp();
        $this->provider = app(ApiIrShahkarProvider::class);
    }

    public function test_is_configured_with_token_only_and_default_base_url(): void
    {
        $this->seedApiIr(credentials: ['api_token' => 'test-token'], settings: []);

        $this->assertTrue($this->provider->isConfigured());
    }

    public function test_accepts_legacy_api_key_credential(): void
    {
        $this->seedApiIr(credentials: ['api_key' => 'legacy-token'], settings: []);

        $this->assertTrue($this->provider->isConfigured());
    }

    public function test_shahkar_lite_uses_bearer_and_matches_on_data_true_despite_success_false(): void
    {
        $this->seedApiIr(credentials: ['api_token' => 'Bearer pasted-token']);

        Http::fake([
            's.api.ir/api/sw1/ShahkarLite' => Http::response([
                'data' => true,
                'success' => false,
                'code' => 0,
                'message' => null,
            ], 200),
        ]);

        $result = $this->provider->verify('09120000000', '0010007700');

        $this->assertSame(OwnershipVerificationResult::Matched, $result->normalized_result);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://s.api.ir/api/sw1/ShahkarLite'
                && $request->method() === 'POST'
                && $request->hasHeader('Authorization', 'Bearer pasted-token')
                && $request['nationalCode'] === '0010007700'
                && $request['mobile'] === '09120000000'
                && ! array_key_exists('businessId', $request->data())
                && ! array_key_exists('businessToken', $request->data());
        });
    }

    public function test_shahkar_lite_mismatched_when_data_false(): void
    {
        $this->seedApiIr(credentials: ['api_token' => 'tok']);

        Http::fake([
            's.api.ir/api/sw1/ShahkarLite' => Http::response([
                'data' => false,
                'success' => false,
                'code' => 0,
                'message' => null,
            ], 200),
        ]);

        $result = $this->provider->verify('09120000000', '0010007700');

        $this->assertSame(OwnershipVerificationResult::Mismatched, $result->normalized_result);
    }

    public function test_person_info_sends_latin_birth_date_and_parses_identity(): void
    {
        $this->seedApiIr(credentials: ['api_token' => 'tok']);

        Http::fake([
            's.api.ir/api/sw1/PersonInfo' => Http::response([
                'data' => [
                    'nationalCode' => '0010007700',
                    'firstName' => 'محسن',
                    'lastName' => 'اکبری',
                    'fatherName' => 'علی',
                    'gender' => 1,
                    'alive' => true,
                ],
                'success' => false,
                'code' => 0,
                'message' => null,
            ], 200, ['Content-Type' => 'text/plain; charset=utf-8']),
        ]);

        $result = $this->provider->lookup('0010007700', '1992-03-21');

        $this->assertSame(OwnershipVerificationResult::Matched, $result->normalized_result);
        $this->assertSame('محسن', $result->first_name);
        $this->assertSame('اکبری', $result->last_name);
        $this->assertSame('علی', $result->father_name);
        $this->assertSame('male', $result->gender);
        $this->assertTrue($result->alive);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://s.api.ir/api/sw1/PersonInfo'
                && $request->hasHeader('Authorization', 'Bearer tok')
                && $request->hasHeader('Content-Type', 'application/json')
                && $request['nationalCode'] === '0010007700'
                && $request['birthDate'] === '1371/1/1'
                && array_keys($request->data()) === ['nationalCode', 'birthDate'];
        });
    }

    public function test_person_info_permission_message_is_provider_error_not_mismatch(): void
    {
        $this->seedApiIr(credentials: ['api_token' => 'tok']);

        Http::fake([
            's.api.ir/api/sw1/PersonInfo' => Http::response([
                'data' => null,
                'success' => false,
                'code' => '403',
                'message' => 'سطح مجوز trust level کافی نیست',
            ], 200),
        ]);

        $result = $this->provider->lookup('0010007700', '1371/1/1');

        $this->assertSame(OwnershipVerificationResult::ProviderError, $result->normalized_result);
        $this->assertTrue($result->isTechnicalFailure());
        $this->assertStringContainsString('trust', mb_strtolower((string) $result->provider_message));
    }

    public function test_card_match_payload_and_boolean_data(): void
    {
        $this->seedApiIr(credentials: ['api_token' => 'tok']);

        Http::fake([
            's.api.ir/api/sw1/CardMatch' => Http::response([
                'data' => true,
                'success' => false,
                'code' => 0,
                'message' => null,
            ], 200),
        ]);

        $result = $this->provider->verifyCard('6037990000000000', '0010007700', '1371/1/1');

        $this->assertSame(OwnershipVerificationResult::Matched, $result->normalized_result);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://s.api.ir/api/sw1/CardMatch'
                && $request->hasHeader('Authorization', 'Bearer tok')
                && $request['nationalCode'] === '0010007700'
                && $request['birthDate'] === '1371/1/1'
                && $request['cardNumber'] === '6037990000000000';
        });
    }

    public function test_connection_probe_posts_shahkar_lite_with_bearer(): void
    {
        $this->seedApiIr(credentials: ['api_token' => 'eyJ-test-token']);

        Http::fake([
            's.api.ir/api/sw1/ShahkarLite' => Http::response([
                'data' => false,
                'success' => false,
                'code' => 0,
            ], 200),
            's.api.ir/api/sw1/PersonInfo' => Http::response([
                'data' => null,
                'success' => false,
                'code' => 0,
                'message' => 'sample',
            ], 200),
        ]);

        $result = $this->provider->testConnection();

        $this->assertSame(\App\Enums\ProviderConnectionStatus::Connected, $result->status);
        Http::assertSent(function ($request) {
            return $request->url() === 'https://s.api.ir/api/sw1/ShahkarLite'
                && $request->method() === 'POST'
                && $request->hasHeader('Authorization', 'Bearer eyJ-test-token');
        });
        Http::assertSent(function ($request) {
            return $request->url() === 'https://s.api.ir/api/sw1/PersonInfo'
                && $request['nationalCode'] === '0010007700'
                && $request['birthDate'] === '1371/1/1';
        });
    }

    public function test_typo_base_url_apif_is_normalized_and_healed(): void
    {
        $this->seedApiIr(
            credentials: ['api_token' => 'tok'],
            settings: [
                'base_url' => 'https://s.apif.ir',
                'shahkar_path' => '/api/sw1/ShahkarLite',
            ],
        );

        Http::fake([
            's.api.ir/api/sw1/ShahkarLite' => Http::response(['data' => true], 200),
            's.api.ir/api/sw1/PersonInfo' => Http::response(['data' => null, 'success' => false], 200),
            's.apif.ir/*' => Http::response('should not hit', 500),
        ]);

        $result = $this->provider->testConnection();

        $this->assertSame(\App\Enums\ProviderConnectionStatus::Connected, $result->status);
        Http::assertSent(fn ($request) => $request->url() === 'https://s.api.ir/api/sw1/ShahkarLite');
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'apif.ir'));

        $this->assertSame(
            'https://s.api.ir',
            IdentityProviderConfig::query()->where('slug', ApiIrShahkarProvider::SLUG)->value('settings')['base_url'] ?? null,
        );
    }

    /**
     * @param  array<string, mixed>  $credentials
     * @param  array<string, mixed>|null  $settings
     */
    private function seedApiIr(array $credentials, ?array $settings = null): void
    {
        $config = IdentityProviderConfig::query()->create([
            'slug' => ApiIrShahkarProvider::SLUG,
            'label' => 'API.ir شاهکار',
            'capabilities' => [
                'MOBILE_NATIONAL_CODE_MATCH',
                'CARD_NATIONAL_CODE_MATCH',
                'PERSON_INFO_INQUIRY',
            ],
            'is_enabled' => true,
            'settings' => $settings ?? [
                'base_url' => ApiIrShahkarProvider::DEFAULT_BASE_URL,
                'shahkar_path' => '/api/sw1/ShahkarLite',
                'person_info_path' => '/api/sw1/PersonInfo',
                'card_match_path' => '/api/sw1/CardMatch',
                'timeout' => 20,
            ],
        ]);
        $config->setCredentials($credentials);
        $config->save();
    }
}
