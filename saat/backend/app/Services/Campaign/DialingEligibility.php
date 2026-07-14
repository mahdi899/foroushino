<?php

namespace App\Services\Campaign;

readonly class DialingEligibility
{
    public function __construct(
        public bool $allowed,
        public ?string $reason = null,
    ) {}

    public static function allowed(): self
    {
        return new self(true);
    }

    public static function denied(string $reason): self
    {
        return new self(false, $reason);
    }
}
