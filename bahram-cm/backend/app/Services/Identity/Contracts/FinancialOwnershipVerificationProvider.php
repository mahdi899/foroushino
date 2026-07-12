<?php

namespace App\Services\Identity\Contracts;

use App\Enums\IdentityCapability;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;

interface FinancialOwnershipVerificationProvider
{
    public function verifyCard(string $cardNumber, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult;

    public function verifyIban(string $iban, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult;

    /**
     * @return array{iban: ?string, bank_name: ?string, holder_name: ?string}|null
     */
    public function inquireCard(string $cardNumber): ?array;

    /** @return list<IdentityCapability> */
    public function capabilities(): array;

    public function slug(): string;

    public function testConnection(): ProviderConnectionResult;

    public function isConfigured(): bool;
}
