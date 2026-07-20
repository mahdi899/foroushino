<?php

namespace Tests\Unit\Family;

use App\Services\MediaHostSettingsService;
use App\Support\FamilyMediaUrl;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyMediaUrlTest extends TestCase
{
    public function test_public_disk_uses_cdn_when_configured_for_gallery_paths(): void
    {
        config([
            'bahram.frontend_url' => 'https://rostami.app',
            'family.media.cdn_url' => 'https://cdn.rostami.app',
            'bahram.media_url' => 'https://cdn.rostami.app',
        ]);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'fake');

        $url = FamilyMediaUrl::fromPath($path, 'public');

        $this->assertSame('https://cdn.rostami.app/'.$path, $url);
    }

    public function test_remote_disk_uses_cdn_when_file_not_on_local_public(): void
    {
        config(['family.media.cdn_url' => 'https://cdn.example.com']);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');

        $url = FamilyMediaUrl::fromPath($path, 'family_media_ftp');

        $this->assertSame('https://cdn.example.com/'.$path, $url);
    }

    public function test_legacy_remote_disk_still_serves_local_when_public_copy_exists(): void
    {
        config(['family.media.cdn_url' => 'https://cdn.example.com']);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'fake');

        $url = FamilyMediaUrl::fromPath($path, 'family_media_ftp');

        $this->assertSame('https://cdn.example.com/'.$path, $url);
    }

    public function test_local_family_media_returns_frontend_origin_without_cdn(): void
    {
        MediaHostSettingsService::forgetCachedConfig();

        config([
            'family.media.cdn_url' => '',
            'bahram.media_url' => '',
            'bahram.arvan.media_domain' => '',
            'bahram.frontend_url' => 'http://localhost:3000',
        ]);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'fake');

        $url = FamilyMediaUrl::fromPath($path, 'public');

        $this->assertSame('http://localhost:3000/storage/'.$path, $url);
    }

    public function test_cache_buster_appends_version_query(): void
    {
        $this->assertSame(
            '/storage/media/family/x.webp?v=3',
            FamilyMediaUrl::withCacheBuster('/storage/media/family/x.webp', 3),
        );
    }

    public function test_canonicalize_rewrites_club_proxy_to_cdn(): void
    {
        config([
            'family.media.cdn_url' => 'https://cdn.rostami.app',
            'bahram.media_url' => 'https://cdn.rostami.app',
        ]);

        $url = FamilyMediaUrl::fromPath('media/family/2026/07/video/demo.mp4', 'family_media_ftp');

        $this->assertSame(
            'https://cdn.rostami.app/media/family/2026/07/video/demo.mp4',
            $url,
        );
    }
}
