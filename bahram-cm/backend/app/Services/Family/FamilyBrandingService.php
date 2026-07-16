<?php

namespace App\Services\Family;

use App\Models\FamilyBranding;
use App\Support\FamilyMediaUrl;
use Illuminate\Support\Facades\Cache;

final class FamilyBrandingService
{
    private const CACHE_KEY = 'family:branding:public';

    /** @return array{display_name: string, profile_name: string, profile_avatar: ?string, community_avatar: ?string, branding_version: ?int} */
    public function publicPayload(): array
    {
        return Cache::remember(
            self::CACHE_KEY,
            config('family.cache.branding_ttl', 300),
            function () {
                $branding = $this->get();
                $version = $branding->updated_at?->getTimestamp();

                return [
                    'display_name' => $branding->display_name,
                    'profile_name' => $branding->profile_name,
                    'profile_avatar' => $this->versionedAvatar($branding->profile_avatar_path, $version),
                    'community_avatar' => $this->versionedAvatar($branding->community_avatar_path, $version),
                    'branding_version' => $version,
                ];
            },
        );
    }

    private function versionedAvatar(?string $path, ?int $version): ?string
    {
        return FamilyMediaUrl::withCacheBuster(FamilyMediaUrl::fromPath($path), $version);
    }

    public function get(): FamilyBranding
    {
        $existing = FamilyBranding::query()->first();
        if ($existing) {
            return $existing;
        }

        return FamilyBranding::query()->create([
            'display_name' => (string) config('family.display_name', 'خانواده داداش بهرام'),
            'profile_name' => 'بهرام',
        ]);
    }

    /** @param  array{display_name?: string, profile_name?: string, profile_avatar_path?: ?string, community_avatar_path?: ?string}  $data */
    public function update(array $data): FamilyBranding
    {
        $branding = $this->get();

        $branding->update([
            'display_name' => $data['display_name'] ?? $branding->display_name,
            'profile_name' => $data['profile_name'] ?? $branding->profile_name,
            'profile_avatar_path' => array_key_exists('profile_avatar_path', $data)
                ? $data['profile_avatar_path']
                : $branding->profile_avatar_path,
            'community_avatar_path' => array_key_exists('community_avatar_path', $data)
                ? $data['community_avatar_path']
                : $branding->community_avatar_path,
        ]);

        Cache::forget(self::CACHE_KEY);

        return $branding->fresh();
    }
}
