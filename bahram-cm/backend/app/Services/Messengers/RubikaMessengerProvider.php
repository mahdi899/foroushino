<?php

namespace App\Services\Messengers;

use App\Contracts\MessengerProviderContract;

/**
 * Placeholder driver for Rubika. Rubika has no stable, publicly documented
 * bot-send API at this time, so this driver always reports "unavailable"
 * until a real integration is wired up in a future phase.
 */
class RubikaMessengerProvider implements MessengerProviderContract
{
    public function __construct(private readonly MessengerSettingsService $settings) {}

    public function key(): string
    {
        return 'rubika';
    }

    public function label(): string
    {
        return 'روبیکا';
    }

    public function status(): string
    {
        return 'unavailable';
    }

    public function testConnection(): array
    {
        return ['success' => false, 'message' => 'اتصال روبیکا هنوز پیاده‌سازی نشده است (فاز آینده).'];
    }

    public function send(string $chatId, string $message): array
    {
        return ['success' => false, 'message' => 'سرویس روبیکا هنوز در دسترس نیست.'];
    }
}
