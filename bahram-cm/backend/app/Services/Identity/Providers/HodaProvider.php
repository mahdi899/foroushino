<?php

namespace App\Services\Identity\Providers;

use App\Enums\IdentityCapability;
use App\Models\IdentityProviderConfig;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use LogicException;

/**
 * HODA scaffold — no invented endpoints until an official API contract exists.
 */
class HodaProvider implements MobileOwnershipVerificationProvider
{
    public const SLUG = 'hoda';

    public function slug(): string
    {
        return self::SLUG;
    }

    /** @return list<IdentityCapability> */
    public function capabilities(): array
    {
        return [];
    }

    public function isConfigured(): bool
    {
        return false;
    }

    public function testConnection(): ProviderConnectionResult
    {
        return ProviderConnectionResult::configurationIncomplete(
            'سرویس هدا هنوز با قرارداد رسمی API پیکربندی نشده است.'
        );
    }

    public function verify(string $mobile, string $nationalCode): MobileOwnershipVerificationResult
    {
        throw new LogicException('HODA provider is not configured with an official API contract.');
    }

    /** Reserved for future credential wiring without enabling the provider. */
    public function configRecord(): ?IdentityProviderConfig
    {
        return IdentityProviderConfig::query()->where('slug', self::SLUG)->first();
    }
}
