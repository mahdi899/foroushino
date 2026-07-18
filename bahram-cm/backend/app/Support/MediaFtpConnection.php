<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * Panel-managed connection details for the site media library's download
 * host (FTP or SFTP). Host/username/password/port/protocol are stored in
 * the database (encrypted password) so an admin can change them without a
 * redeploy — `AppServiceProvider::configureDynamicMediaDisk()` reads this at
 * boot and overrides the static `site_media_ftp`/`site_media_sftp` disk
 * config for the rest of the request lifecycle.
 */
final class MediaFtpConnection
{
    private const GROUP = 'media';

    private const KEY = 'ftp_connection';

    private const CACHE_KEY = 'media.ftp_connection.config';

    /** @return array{enabled: bool, protocol: string, host: string, port: int, username: string, password: string|null, root: string, passive: bool, ssl: bool, timeout: int, private_key: string} */
    public static function get(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function (): array {
            $row = Setting::query()
                ->where('group', self::GROUP)
                ->where('key', self::KEY)
                ->first();

            $value = $row?->value ?? [];
            $protocol = in_array($value['protocol'] ?? null, ['ftp', 'sftp'], true) ? $value['protocol'] : 'ftp';

            return [
                'enabled' => (bool) ($value['enabled'] ?? false),
                'protocol' => $protocol,
                'host' => trim((string) ($value['host'] ?? '')),
                'port' => (int) ($value['port'] ?? ($protocol === 'sftp' ? 22 : 21)),
                'username' => (string) ($value['username'] ?? ''),
                'password' => self::decrypt($value['password_enc'] ?? null),
                'root' => (string) ($value['root'] ?? '/'),
                'passive' => (bool) ($value['passive'] ?? true),
                'ssl' => (bool) ($value['ssl'] ?? false),
                'timeout' => (int) ($value['timeout'] ?? 60),
                'private_key' => (string) ($value['private_key'] ?? ''),
            ];
        });
    }

    /** @return array<string, mixed> */
    public static function publicView(): array
    {
        $config = self::get();
        $password = $config['password'];

        return [
            'enabled' => $config['enabled'],
            'protocol' => $config['protocol'],
            'host' => $config['host'],
            'port' => $config['port'],
            'username' => $config['username'],
            'password_set' => filled($password),
            'password_preview' => $password ? self::maskSecret($password) : null,
            'root' => $config['root'],
            'passive' => $config['passive'],
            'ssl' => $config['ssl'],
            'timeout' => $config['timeout'],
            'private_key_set' => filled($config['private_key']),
            'disk_name' => self::diskName($config['protocol']),
        ];
    }

    /** @param array<string, mixed> $input */
    public static function save(array $input): void
    {
        $current = self::get();

        $password = array_key_exists('password', $input)
            ? ($input['password'] !== '' && $input['password'] !== null ? (string) $input['password'] : null)
            : $current['password'];

        $privateKey = array_key_exists('private_key', $input)
            ? (string) ($input['private_key'] ?? '')
            : $current['private_key'];

        Setting::query()->updateOrCreate(
            ['group' => self::GROUP, 'key' => self::KEY],
            [
                'value' => [
                    'enabled' => (bool) ($input['enabled'] ?? $current['enabled']),
                    'protocol' => in_array($input['protocol'] ?? null, ['ftp', 'sftp'], true) ? $input['protocol'] : $current['protocol'],
                    'host' => isset($input['host']) ? trim((string) $input['host']) : $current['host'],
                    'port' => isset($input['port']) ? (int) $input['port'] : $current['port'],
                    'username' => isset($input['username']) ? (string) $input['username'] : $current['username'],
                    'password_enc' => $password ? Crypt::encryptString($password) : null,
                    'root' => isset($input['root']) ? (string) $input['root'] : $current['root'],
                    'passive' => isset($input['passive']) ? (bool) $input['passive'] : $current['passive'],
                    'ssl' => isset($input['ssl']) ? (bool) $input['ssl'] : $current['ssl'],
                    'timeout' => isset($input['timeout']) ? (int) $input['timeout'] : $current['timeout'],
                    'private_key' => $privateKey,
                ],
            ],
        );

        Cache::forget(self::CACHE_KEY);
    }

    public static function isReady(): bool
    {
        $config = self::get();

        if (! $config['enabled'] || $config['host'] === '' || $config['username'] === '') {
            return false;
        }

        return $config['protocol'] === 'sftp'
            ? (filled($config['password']) || filled($config['private_key']))
            : filled($config['password']);
    }

    public static function diskName(?string $protocol = null): string
    {
        $protocol ??= self::get()['protocol'];

        return $protocol === 'sftp' ? 'site_media_sftp' : 'site_media_ftp';
    }

    /** Flysystem-compatible disk config array, ready for `config(["filesystems.disks.{$name}" => ...])`. */
    public static function toDiskConfig(): array
    {
        $config = self::get();

        if ($config['protocol'] === 'sftp') {
            return [
                'driver' => 'sftp',
                'host' => $config['host'],
                'username' => $config['username'],
                'password' => $config['password'] ?: null,
                'privateKey' => $config['private_key'] ?: null,
                'port' => $config['port'],
                'root' => $config['root'],
                'timeout' => $config['timeout'],
                'throw' => true,
            ];
        }

        return [
            'driver' => 'ftp',
            'host' => $config['host'],
            'username' => $config['username'],
            'password' => $config['password'] ?: '',
            'port' => $config['port'],
            'root' => $config['root'],
            'passive' => $config['passive'],
            'ssl' => $config['ssl'],
            'timeout' => $config['timeout'],
            'throw' => true,
        ];
    }

    private static function decrypt(mixed $encrypted): ?string
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

    private static function maskSecret(string $secret): string
    {
        if (strlen($secret) <= 4) {
            return '••••••••';
        }

        return substr($secret, 0, 2).'••••'.substr($secret, -2);
    }
}
