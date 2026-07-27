<?php

namespace App\Services\Identity\Contracts;

use App\Enums\IdentityCapability;
use App\Services\Identity\DTOs\PersonInfoResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;

interface PersonInfoVerificationProvider
{
    /** @param  string  $birthDate  Jalali date, e.g. 1371/1/1 */
    public function lookup(string $nationalCode, string $birthDate): PersonInfoResult;

    /** @return list<IdentityCapability> */
    public function capabilities(): array;

    public function slug(): string;

    public function testConnection(): ProviderConnectionResult;

    public function isConfigured(): bool;
}
