<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Git-tracked download-host URLs (database/data/media_hosts.json) → settings table.
 * Env vars remain as fallback for production overrides.
 */
class MediaHostSettingsService
{
    public const GROUP = 'media';

    public const KEY = 'hosts';

    public const MANIFEST = 'database/data/media_hosts.json';

    private const CACHE_KEY = 'media.hosts.config';

    /** @return array{media_url?: string, family_media_cdn_url?: string} */
    private function stored(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            try {
                $raw = Setting::query()
                    ->where('group', self::GROUP)
                    ->where('key', self::KEY)
                    ->value('value');

                return is_array($raw) ? $raw : [];
            } catch (\Throwable) {
                return [];
            }
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function mediaUrl(): ?string
    {
        $stored = $this->normalizeUrl($this->stored()['media_url'] ?? null);
        if ($stored !== null) {
            return $stored;
        }

        $env = $this->normalizeUrl(config('bahram.media_url'));
        if ($env !== null) {
            return $env;
        }

        $manifest = $this->manifestDefaults();
        $fromManifest = $this->normalizeUrl($manifest['media_url'] ?? null);
        if ($fromManifest !== null && $this->shouldUseManifestFallback()) {
            return $fromManifest;
        }

        return $this->arvanMediaOrigin();
    }

    public function familyMediaCdnUrl(): ?string
    {
        $stored = $this->normalizeUrl($this->stored()['family_media_cdn_url'] ?? null);
        if ($stored !== null && ! $this->isClubMediaProxyUrl($stored)) {
            return $stored;
        }

        $env = $this->normalizeUrl(config('family.media.cdn_url'));
        if ($env !== null && ! $this->isClubMediaProxyUrl($env)) {
            return $env;
        }

        $media = $this->mediaUrl();
        if ($media !== null && ! $this->isClubMediaProxyUrl($media)) {
            return $media;
        }

        $manifest = $this->manifestDefaults();
        $fromManifest = $this->normalizeUrl($manifest['family_media_cdn_url'] ?? null);
        if ($fromManifest !== null && $this->shouldUseManifestFallback() && ! $this->isClubMediaProxyUrl($fromManifest)) {
            return $fromManifest;
        }

        return $this->arvanMediaOrigin();
    }

  private function shouldUseManifestFallback(): bool
  {
        if (! app()->environment(['local', 'testing'])) {
            return true;
        }

        $stored = $this->stored();
        if (filled($stored['media_url'] ?? null) || filled($stored['family_media_cdn_url'] ?? null)) {
            return true;
        }

        // Local dev: when env CDN vars are unset, use git-tracked media_hosts.json (cdn.rostami.app).
        return ! filled(config('family.media.cdn_url')) && ! filled(config('bahram.media_url'));
    }

    /** @return array{media_url: string|null, family_media_cdn_url: string|null} */
    public function publicView(): array
    {
        return [
            'media_url' => $this->mediaUrl(),
            'family_media_cdn_url' => $this->familyMediaCdnUrl(),
        ];
    }

    /** @param  array{media_url?: string|null, family_media_cdn_url?: string|null}  $payload */
    public function update(array $payload): void
    {
        $current = $this->stored();
        $next = $current;

        if (array_key_exists('media_url', $payload)) {
            $next['media_url'] = $this->normalizeUrl($payload['media_url']) ?? '';
        }
        if (array_key_exists('family_media_cdn_url', $payload)) {
            $next['family_media_cdn_url'] = $this->normalizeUrl($payload['family_media_cdn_url']) ?? '';
        }

        Setting::query()->updateOrCreate(
            ['group' => self::GROUP, 'key' => self::KEY],
            ['value' => $next],
        );

        self::forgetCachedConfig();
    }

    /** @return array{version?: int, media_url?: string, family_media_cdn_url?: string} */
    public function manifestDefaults(): array
    {
        $path = base_path(self::MANIFEST);
        if (! is_readable($path)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $decoded : [];
    }

    public function importFromManifest(): void
    {
        $manifest = $this->manifestDefaults();
        $this->update([
            'media_url' => $manifest['media_url'] ?? null,
            'family_media_cdn_url' => $manifest['family_media_cdn_url'] ?? null,
        ]);
    }

    private function arvanMediaOrigin(): ?string
    {
        try {
            $storedArvan = trim((string) app(CacheIntegrationService::class)->arvanMediaDomain());
            if ($storedArvan !== '') {
                return str_starts_with($storedArvan, 'http') ? rtrim($storedArvan, '/') : 'https://'.$storedArvan;
            }
        } catch (\Throwable) {
            // settings table may be unavailable before migrate / in unit tests
        }

        $env = trim((string) config('bahram.arvan.media_domain', ''));
        if ($env === '') {
            return null;
        }

        return str_starts_with($env, 'http') ? rtrim($env, '/') : 'https://'.$env;
    }

    private function normalizeUrl(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? rtrim($trimmed, '/') : null;
    }

    /** rostami.club/media/family proxy breaks video Range — never use as CDN base. */
    private function isClubMediaProxyUrl(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return in_array($host, ['rostami.club', 'www.rostami.club'], true);
    }
}
