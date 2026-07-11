<?php

namespace App\Services\Identity\DTOs;

use App\Enums\OwnershipVerificationResult;

final class MobileOwnershipVerificationResult
{
    public function __construct(
        public readonly OwnershipVerificationResult $normalized_result,
        public readonly ?string $provider_code = null,
        public readonly ?string $provider_message = null,
        public readonly ?string $provider_request_id = null,
        public readonly ?int $duration_ms = null,
    ) {}

    public function isBusinessResult(): bool
    {
        return in_array($this->normalized_result, [
            OwnershipVerificationResult::Matched,
            OwnershipVerificationResult::Mismatched,
        ], true);
    }

    public function isTechnicalFailure(): bool
    {
        return in_array($this->normalized_result, [
            OwnershipVerificationResult::TechnicalError,
            OwnershipVerificationResult::ProviderError,
            OwnershipVerificationResult::Unauthorized,
            OwnershipVerificationResult::RateLimited,
        ], true);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'normalized_result' => $this->normalized_result->value,
            'provider_code' => $this->provider_code,
            'provider_message' => $this->provider_message,
            'provider_request_id' => $this->provider_request_id,
            'duration_ms' => $this->duration_ms,
        ];
    }
}
