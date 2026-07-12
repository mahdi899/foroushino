<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;

/**
 * Outbound integration config stored on Bahram site only.
 * SAT URL + token — used to push accepted applications once.
 */
final class SatIntegrationConfig
{
    private const GROUP = 'sat_integration';

    private const KEY = 'outbound';

    /** @return array{enabled: bool, api_url: string|null, api_token: string|null} */
    public static function get(): array
    {
        $row = Setting::query()
            ->where('group', self::GROUP)
            ->where('key', self::KEY)
            ->first();

        $value = $row?->value ?? [];

        return [
            'enabled' => (bool) ($value['enabled'] ?? false),
            'api_url' => isset($value['api_url']) ? (string) $value['api_url'] : null,
            'api_token' => self::decryptToken($value['api_token_enc'] ?? null),
        ];
    }

    /** @return array{enabled: bool, api_url: string|null, api_token_set: bool, api_token_preview: string|null} */
    public static function publicView(): array
    {
        $config = self::get();
        $token = $config['api_token'];

        return [
            'enabled' => $config['enabled'],
            'api_url' => $config['api_url'],
            'api_token_set' => filled($token),
            'api_token_preview' => $token ? self::maskToken($token) : null,
        ];
    }

    /** @param array{enabled?: bool, api_url?: string|null, api_token?: string|null} $input */
    public static function save(array $input): void
    {
        $current = self::get();
        $token = array_key_exists('api_token', $input)
            ? ($input['api_token'] !== '' && $input['api_token'] !== null ? (string) $input['api_token'] : null)
            : $current['api_token'];

        Setting::query()->updateOrCreate(
            ['group' => self::GROUP, 'key' => self::KEY],
            [
                'value' => [
                    'enabled' => (bool) ($input['enabled'] ?? $current['enabled']),
                    'api_url' => isset($input['api_url']) ? trim((string) $input['api_url']) : $current['api_url'],
                    'api_token_enc' => $token ? Crypt::encryptString($token) : null,
                ],
            ],
        );
    }

    public static function isReady(): bool
    {
        $config = self::get();

        return $config['enabled']
            && filled($config['api_url'])
            && filled($config['api_token']);
    }

    private static function decryptToken(mixed $encrypted): ?string
    {
        if (! is_string($encrypted) || $encrypted === '') {
            return null;
        }

        try {
            return Crypt::decryptString($encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    private static function maskToken(string $token): string
    {
        if (strlen($token) <= 8) {
            return '••••••••';
        }

        return substr($token, 0, 4).'••••'.substr($token, -4);
    }
}
