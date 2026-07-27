<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/** Shared helpers for host ↔ Iran bridge configuration. */
final class HostBridgeConfig
{
    /**
     * @param  array<string, mixed>  $config
     */
    public static function syncToken(array $config): string
    {
        $token = trim((string) ($config['host_sync_token'] ?? $config['hmac_secret'] ?? ''));

        return $token;
    }
}
