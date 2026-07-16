<?php

namespace App\Services\Family;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/** Panel-managed toggles for family media pipeline (env defaults as fallback). */
class FamilyMediaSettingsService
{
    public const GROUP = 'family';

    public const KEY = 'media_pipeline';

    private const CACHE_KEY = 'family.media_pipeline.config';

    /** @return array<string, mixed> */
    private function stored(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            $raw = Setting::query()
                ->where('group', self::GROUP)
                ->where('key', self::KEY)
                ->value('value');

            return is_array($raw) ? $raw : [];
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function optimizeImages(): bool
    {
        if (array_key_exists('optimize_images', $this->stored())) {
            return filter_var($this->stored()['optimize_images'], FILTER_VALIDATE_BOOL);
        }

        return filter_var(config('family.media.optimize_images', true), FILTER_VALIDATE_BOOL);
    }

    public function syncToSiteLibrary(): bool
    {
        if (array_key_exists('sync_to_site_library', $this->stored())) {
            return filter_var($this->stored()['sync_to_site_library'], FILTER_VALIDATE_BOOL);
        }

        return filter_var(config('family.media.sync_to_site_library', true), FILTER_VALIDATE_BOOL);
    }

    public function ftpUploadEnabled(): bool
    {
        if (array_key_exists('ftp_upload_enabled', $this->stored())) {
            return filter_var($this->stored()['ftp_upload_enabled'], FILTER_VALIDATE_BOOL);
        }

        return filter_var(config('family.media.ftp_upload_enabled', true), FILTER_VALIDATE_BOOL);
    }

    public function uploadDisk(): string
    {
        if (! $this->ftpUploadEnabled()) {
            return 'public';
        }

        $configured = (string) config('family.media.disk', 'family_media_ftp');
        if ($configured === 'family_media_ftp' && ! filled(config('filesystems.disks.family_media_ftp.host'))) {
            return 'public';
        }

        return $configured;
    }

    public function siteLibraryDisk(): string
    {
        $disk = (string) config('bahram.uploads.public_disk', 'public');

        if ($disk === 'site_media_ftp' && ! filled(config('filesystems.disks.site_media_ftp.host'))) {
            return 'public';
        }

        return $disk;
    }

    /** @return array<string, mixed> */
    public function adminView(): array
    {
        return [
            'optimize_images' => $this->optimizeImages(),
            'sync_to_site_library' => $this->syncToSiteLibrary(),
            'ftp_upload_enabled' => $this->ftpUploadEnabled(),
            'upload_disk' => $this->uploadDisk(),
            'site_library_disk' => $this->siteLibraryDisk(),
            'cdn_url' => config('family.media.cdn_url'),
        ];
    }

    /** @param  array<string, mixed>  $payload */
    public function update(array $payload): void
    {
        $current = $this->stored();
        $next = array_merge($current, array_filter([
            'optimize_images' => array_key_exists('optimize_images', $payload)
                ? filter_var($payload['optimize_images'], FILTER_VALIDATE_BOOL)
                : null,
            'sync_to_site_library' => array_key_exists('sync_to_site_library', $payload)
                ? filter_var($payload['sync_to_site_library'], FILTER_VALIDATE_BOOL)
                : null,
            'ftp_upload_enabled' => array_key_exists('ftp_upload_enabled', $payload)
                ? filter_var($payload['ftp_upload_enabled'], FILTER_VALIDATE_BOOL)
                : null,
        ], fn ($v) => $v !== null));

        Setting::query()->updateOrCreate(
            ['group' => self::GROUP, 'key' => self::KEY],
            ['value' => $next],
        );

        self::forgetCachedConfig();
    }
}
