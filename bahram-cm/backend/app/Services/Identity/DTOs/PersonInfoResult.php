<?php

namespace App\Services\Identity\DTOs;

use App\Enums\OwnershipVerificationResult;

/**
 * Result of a PersonInfo (civil registry) lookup by national code + birth date.
 *
 * `normalized_result` reuses OwnershipVerificationResult semantics:
 * Matched = registry returned a person record, Mismatched = no record found
 * for the given national code / birth date combination.
 */
final class PersonInfoResult
{
    public function __construct(
        public readonly OwnershipVerificationResult $normalized_result,
        public readonly ?string $first_name = null,
        public readonly ?string $last_name = null,
        public readonly ?string $father_name = null,
        public readonly ?string $gender = null,
        public readonly ?bool $alive = null,
        public readonly ?string $provider_code = null,
        public readonly ?string $provider_message = null,
        public readonly ?string $provider_request_id = null,
        public readonly ?int $duration_ms = null,
    ) {}

    public function isTechnicalFailure(): bool
    {
        return in_array($this->normalized_result, [
            OwnershipVerificationResult::TechnicalError,
            OwnershipVerificationResult::ProviderError,
            OwnershipVerificationResult::Unauthorized,
            OwnershipVerificationResult::RateLimited,
        ], true);
    }

    public function hasNames(): bool
    {
        return filled($this->first_name) && filled($this->last_name);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'normalized_result' => $this->normalized_result->value,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'father_name' => $this->father_name,
            'gender' => $this->gender,
            'alive' => $this->alive,
            'provider_code' => $this->provider_code,
            'provider_message' => $this->provider_message,
            'provider_request_id' => $this->provider_request_id,
            'duration_ms' => $this->duration_ms,
        ];
    }
}
