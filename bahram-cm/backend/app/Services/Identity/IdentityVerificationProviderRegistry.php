<?php

namespace App\Services\Identity;

use App\Enums\IdentityCapability;
use App\Models\IdentityVerificationRoute;
use App\Services\Identity\Contracts\FinancialOwnershipVerificationProvider;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\Providers\ApiIrShahkarProvider;
use App\Services\Identity\Providers\HodaProvider;
use App\Services\Identity\Providers\ManualReviewProvider;
use App\Services\Identity\Providers\UidEkycProvider;
use App\Services\Identity\Providers\UidFinancialVerificationProvider;
use App\Services\Identity\Providers\UidShahkarProvider;
use InvalidArgumentException;
use RuntimeException;

class IdentityVerificationProviderRegistry
{
    /** @var array<string, object> */
    private array $providers;

    public function __construct(
        ManualReviewProvider $manualReview,
        UidShahkarProvider $uidShahkar,
        ApiIrShahkarProvider $apiIrShahkar,
        UidFinancialVerificationProvider $uidFinancial,
        UidEkycProvider $uidEkyc,
        HodaProvider $hoda,
    ) {
        $this->providers = [
            $manualReview->slug() => $manualReview,
            $uidShahkar->slug() => $uidShahkar,
            $apiIrShahkar->slug() => $apiIrShahkar,
            $uidFinancial->slug() => $uidFinancial,
            $uidEkyc->slug() => $uidEkyc,
            $hoda->slug() => $hoda,
        ];
    }

    public function resolve(string $slug): object
    {
        if (! isset($this->providers[$slug])) {
            throw new InvalidArgumentException("Unknown identity provider slug [{$slug}].");
        }

        return $this->providers[$slug];
    }

    /**
     * @return array{provider: MobileOwnershipVerificationProvider|FinancialOwnershipVerificationProvider, result: MobileOwnershipVerificationResult, used_fallback: bool, route: ?IdentityVerificationRoute}
     */
    public function resolveForCapability(
        IdentityCapability $capability,
        callable $verifyWith,
    ): array {
        $route = IdentityVerificationRoute::query()
            ->where('capability', $capability->value)
            ->where('is_active', true)
            ->first();

        if (! $route) {
            throw new RuntimeException("No active identity verification route for [{$capability->value}].");
        }

        $primary = $this->resolveCapabilityProvider($capability, $route->primary_provider);
        $primaryResult = $verifyWith($primary);

        if (! $primaryResult instanceof MobileOwnershipVerificationResult) {
            throw new RuntimeException('Provider verify callback must return MobileOwnershipVerificationResult.');
        }

        if (! $primaryResult->isTechnicalFailure() || blank($route->fallback_provider)) {
            return [
                'provider' => $primary,
                'result' => $primaryResult,
                'used_fallback' => false,
                'route' => $route,
            ];
        }

        $fallback = $this->resolveCapabilityProvider($capability, $route->fallback_provider);
        $fallbackResult = $verifyWith($fallback);

        return [
            'provider' => $fallback,
            'result' => $fallbackResult,
            'used_fallback' => true,
            'route' => $route,
        ];
    }

    public function resolveCapabilityProvider(
        IdentityCapability $capability,
        string $slug,
    ): MobileOwnershipVerificationProvider|FinancialOwnershipVerificationProvider {
        return match ($capability) {
            IdentityCapability::CardNationalCodeMatch,
            IdentityCapability::IbanNationalCodeMatch => $this->resolveFinancialProvider($slug),
            default => $this->resolveMobileProvider($slug),
        };
    }

    public function resolveMobileProvider(string $slug): MobileOwnershipVerificationProvider
    {
        $provider = $this->resolve($slug);

        if (! $provider instanceof MobileOwnershipVerificationProvider) {
            throw new InvalidArgumentException("Provider [{$slug}] does not support mobile ownership verification.");
        }

        return $provider;
    }

    public function resolveFinancialProvider(string $slug): FinancialOwnershipVerificationProvider
    {
        $provider = $this->resolve($slug);

        if (! $provider instanceof FinancialOwnershipVerificationProvider) {
            throw new InvalidArgumentException("Provider [{$slug}] does not support financial ownership verification.");
        }

        return $provider;
    }

    /** @return array<string, object> */
    public function all(): array
    {
        return $this->providers;
    }
}
