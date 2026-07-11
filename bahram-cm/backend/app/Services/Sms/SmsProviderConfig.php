<?php

namespace App\Services\Sms;

readonly class SmsProviderConfig
{
    public function __construct(
        public string $slug,
        public ?string $credentials,
        public ?string $senderNumber,
        public ?string $patternCode = null,
        public ?string $baseUrl = null,
    ) {}

    public function resolvedBase(string $default): string
    {
        return rtrim($this->baseUrl ?: $default, '/');
    }
}
