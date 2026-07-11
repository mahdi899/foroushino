<?php

namespace App\Services\Identity\Providers;

use App\Enums\IdentityCapability;
use App\Services\Identity\DTOs\ProviderConnectionResult;

/**
 * Local manual document/video review — no remote API.
 */
class ManualReviewProvider
{
    public const SLUG = 'manual-review';

    public function slug(): string
    {
        return self::SLUG;
    }

    /** @return list<IdentityCapability> */
    public function capabilities(): array
    {
        return [
            IdentityCapability::IdentityManualReview,
            IdentityCapability::DocumentReview,
        ];
    }

    public function isConfigured(): bool
    {
        return true;
    }

    public function testConnection(): ProviderConnectionResult
    {
        return ProviderConnectionResult::connected('بررسی دستی همیشه در دسترس است.');
    }
}
