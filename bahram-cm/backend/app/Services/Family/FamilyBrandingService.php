<?php

namespace App\Services\Family;

use App\Models\FamilyBranding;
use App\Support\FamilyMediaUrl;

final class FamilyBrandingService
{
    /** @return array{display_name: string, profile_name: string, profile_avatar: ?string, community_avatar: ?string} */
    public function publicPayload(): array
    {
        $branding = $this->get();

        return [
            'display_name' => $branding->display_name,
            'profile_name' => $branding->profile_name,
            'profile_avatar' => FamilyMediaUrl::fromPath($branding->profile_avatar_path),
            'community_avatar' => FamilyMediaUrl::fromPath($branding->community_avatar_path),
        ];
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

        return $branding->fresh();
    }
}
