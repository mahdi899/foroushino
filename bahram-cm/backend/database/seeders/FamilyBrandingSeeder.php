<?php

namespace Database\Seeders;

use App\Models\FamilyBranding;
use App\Models\FamilyMedia;
use Illuminate\Database\Seeder;

/**
 * برندینگ خانواده — نام نمایشی، نام مدیر، آواتارها.
 * Idempotent: ردیف singleton با id=1.
 */
class FamilyBrandingSeeder extends Seeder
{
    private const PROFILE_AVATAR_PATH = 'family-demo/demo-image-1.jpg';

    private const COMMUNITY_AVATAR_PATH = 'family-demo/demo-image-2.jpg';

    public function run(): void
    {
        $payload = [
            'display_name' => (string) config('family.display_name', 'خانواده داداش بهرام'),
            'profile_name' => 'بهرام',
            'profile_avatar_path' => $this->resolveAvatarPath(self::PROFILE_AVATAR_PATH),
            'community_avatar_path' => $this->resolveAvatarPath(self::COMMUNITY_AVATAR_PATH),
        ];

        $branding = FamilyBranding::query()->updateOrCreate(['id' => 1], $payload);

        $this->command?->info(sprintf(
            'برندینگ خانواده: «%s» | مدیر: %s',
            $branding->display_name,
            $branding->profile_name,
        ));
    }

    private function resolveAvatarPath(string $storagePath): ?string
    {
        $absolute = storage_path('app/public/'.$storagePath);
        if (! is_file($absolute)) {
            return FamilyMedia::query()->where('storage_path', $storagePath)->exists()
                ? $storagePath
                : null;
        }

        return $storagePath;
    }
}
