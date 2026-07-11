<?php

namespace App\Services\Identity\Providers;

use App\Enums\IdentityCapability;
use App\Models\IdentityProviderConfig;
use App\Services\Identity\Contracts\IdentityVideoVerificationProvider;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use LogicException;
use RuntimeException;

/**
 * U-ID eKYC / selfie video — async stubs until full contract is wired.
 */
class UidEkycProvider implements IdentityVideoVerificationProvider
{
    public const SLUG = 'uid-ekyc';

    public function slug(): string
    {
        return self::SLUG;
    }

    /** @return list<IdentityCapability> */
    public function capabilities(): array
    {
        return [
            IdentityCapability::SelfieVideoVerification,
            IdentityCapability::FaceLiveness,
            IdentityCapability::FaceMatch,
        ];
    }

    public function isConfigured(): bool
    {
        $config = $this->config();
        if (! $config || ! $config->is_enabled) {
            return false;
        }

        $credentials = $config->getCredentials();

        return filled($credentials['business_id'] ?? null)
            && filled($credentials['business_token'] ?? null);
    }

    public function testConnection(): ProviderConnectionResult
    {
        if (! $this->isConfigured()) {
            return ProviderConnectionResult::configurationIncomplete(
                'اطلاعات احراز هویت eKYC یوآیدی تکمیل نشده است.'
            );
        }

        return ProviderConnectionResult::connected('پیکربندی eKYC یوآیدی موجود است (استاب async).');
    }

    public function startVerification(array $context): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('U-ID eKYC provider is not configured.');
        }

        throw new LogicException('U-ID eKYC startVerification is not yet implemented against an official session API.');
    }

    public function handleCallback(array $payload): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('U-ID eKYC provider is not configured.');
        }

        throw new LogicException('U-ID eKYC handleCallback is not yet implemented against an official callback contract.');
    }

    private function config(): ?IdentityProviderConfig
    {
        return IdentityProviderConfig::query()->where('slug', self::SLUG)->first();
    }
}
