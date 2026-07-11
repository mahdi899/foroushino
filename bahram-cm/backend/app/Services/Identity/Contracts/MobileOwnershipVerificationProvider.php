<?php

namespace App\Services\Identity\Contracts;

use App\Enums\IdentityCapability;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;

interface MobileOwnershipVerificationProvider
{
    public function verify(string $mobile, string $nationalCode): MobileOwnershipVerificationResult;

    /** @return list<IdentityCapability> */
    public function capabilities(): array;

    public function slug(): string;

    public function testConnection(): ProviderConnectionResult;

    public function isConfigured(): bool;
}
