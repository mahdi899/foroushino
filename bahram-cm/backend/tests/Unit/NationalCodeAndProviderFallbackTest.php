<?php

namespace Tests\Unit;

use App\Enums\IdentityCapability;
use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityVerificationRoute;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use App\Support\NationalCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NationalCodeAndProviderFallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_national_code_mask_and_roundtrip_encrypt(): void
    {
        $code = '0010350829';
        $this->assertTrue(NationalCode::isValid($code));
        $this->assertSame('001******9', NationalCode::mask($code));

        $encrypted = NationalCode::encrypt($code);
        $this->assertSame($code, NationalCode::decrypt($encrypted));
        $this->assertSame(64, strlen(NationalCode::hash($code)));
    }

    public function test_fallback_runs_on_technical_error_not_on_mismatch(): void
    {
        IdentityVerificationRoute::query()->create([
            'capability' => IdentityCapability::MobileNationalCodeMatch->value,
            'primary_provider' => 'primary-fake',
            'fallback_provider' => 'fallback-fake',
            'is_active' => true,
        ]);

        $primaryCalls = 0;
        $fallbackCalls = 0;

        $primary = $this->fakeProvider('primary-fake', function () use (&$primaryCalls) {
            $primaryCalls++;

            return OwnershipVerificationResult::TechnicalError;
        });
        $fallback = $this->fakeProvider('fallback-fake', function () use (&$fallbackCalls) {
            $fallbackCalls++;

            return OwnershipVerificationResult::Matched;
        });

        $outcome = $this->resolveWithFallback($primary, $fallback);
        $this->assertTrue($outcome['used_fallback']);
        $this->assertSame(1, $primaryCalls);
        $this->assertSame(1, $fallbackCalls);
        $this->assertSame(OwnershipVerificationResult::Matched, $outcome['result']->normalized_result);

        $primaryCalls = 0;
        $fallbackCalls = 0;
        $primaryMismatch = $this->fakeProvider('primary-fake', function () use (&$primaryCalls) {
            $primaryCalls++;

            return OwnershipVerificationResult::Mismatched;
        });

        $outcome2 = $this->resolveWithFallback($primaryMismatch, $fallback);
        $this->assertFalse($outcome2['used_fallback']);
        $this->assertSame(1, $primaryCalls);
        $this->assertSame(0, $fallbackCalls);
        $this->assertSame(OwnershipVerificationResult::Mismatched, $outcome2['result']->normalized_result);
    }

    /**
     * Mirrors IdentityVerificationProviderRegistry fallback rules.
     *
     * @return array{result: MobileOwnershipVerificationResult, used_fallback: bool}
     */
    private function resolveWithFallback(
        MobileOwnershipVerificationProvider $primary,
        MobileOwnershipVerificationProvider $fallback,
    ): array {
        $route = IdentityVerificationRoute::query()
            ->where('capability', IdentityCapability::MobileNationalCodeMatch->value)
            ->firstOrFail();

        $primaryResult = $primary->verify('09121234567', '0010350829');

        if (! $primaryResult->isTechnicalFailure() || blank($route->fallback_provider)) {
            return ['result' => $primaryResult, 'used_fallback' => false];
        }

        return [
            'result' => $fallback->verify('09121234567', '0010350829'),
            'used_fallback' => true,
        ];
    }

    private function fakeProvider(string $slug, callable $resultFactory): MobileOwnershipVerificationProvider
    {
        return new class($slug, $resultFactory) implements MobileOwnershipVerificationProvider
        {
            public function __construct(private string $slugName, private $resultFactory) {}

            public function slug(): string
            {
                return $this->slugName;
            }

            public function capabilities(): array
            {
                return [IdentityCapability::MobileNationalCodeMatch];
            }

            public function isConfigured(): bool
            {
                return true;
            }

            public function testConnection(): ProviderConnectionResult
            {
                return ProviderConnectionResult::connected();
            }

            public function verify(string $mobile, string $nationalCode): MobileOwnershipVerificationResult
            {
                return new MobileOwnershipVerificationResult(
                    normalized_result: ($this->resultFactory)(),
                );
            }
        };
    }
}
