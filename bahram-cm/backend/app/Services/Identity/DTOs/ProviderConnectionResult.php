<?php

namespace App\Services\Identity\DTOs;

use App\Enums\ProviderConnectionStatus;

final class ProviderConnectionResult
{
    public function __construct(
        public readonly ProviderConnectionStatus $status,
        public readonly string $message = '',
    ) {}

    public static function connected(string $message = 'اتصال برقرار است.'): self
    {
        return new self(ProviderConnectionStatus::Connected, $message);
    }

    public static function invalidCredentials(string $message = 'اطلاعات احراز هویت سرویس نامعتبر است.'): self
    {
        return new self(ProviderConnectionStatus::InvalidCredentials, $message);
    }

    public static function providerUnavailable(string $message = 'سرویس در دسترس نیست.'): self
    {
        return new self(ProviderConnectionStatus::ProviderUnavailable, $message);
    }

    public static function configurationIncomplete(string $message = 'پیکربندی سرویس ناقص است.'): self
    {
        return new self(ProviderConnectionStatus::ConfigurationIncomplete, $message);
    }

    /** @return array{status: string, message: string} */
    public function toArray(): array
    {
        return [
            'status' => $this->status->value,
            'message' => $this->message,
        ];
    }
}
