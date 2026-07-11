<?php

namespace App\Services\Identity\Contracts;

use App\Enums\IdentityCapability;
use App\Services\Identity\DTOs\ProviderConnectionResult;

interface IdentityVideoVerificationProvider
{
    /**
     * Start an async video / eKYC verification session.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function startVerification(array $context): array;

    /**
     * Handle provider callback / webhook payload.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function handleCallback(array $payload): array;

    /** @return list<IdentityCapability> */
    public function capabilities(): array;

    public function slug(): string;

    public function testConnection(): ProviderConnectionResult;

    public function isConfigured(): bool;
}
