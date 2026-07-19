<?php

namespace Tests\Unit\Family;

use App\Support\FamilyMediaUrl;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyMediaUrlTest extends TestCase
{
    public function test_public_disk_returns_local_storage_path_even_when_cdn_configured(): void
    {
        config([
            'family.media.cdn_url' => 'https://cdn.example.com',
            'bahram.media_url' => 'https://cdn.rostami.app',
            'bahram.arvan.media_domain' => 'cdn.rostami.app',
        ]);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'fake');

        $url = FamilyMediaUrl::fromPath($path, 'public');

        $this->assertSame('/storage/'.$path, $url);
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

        $this->assertSame('/storage/'.$path, $url);
    }

    public function test_local_family_media_returns_relative_storage_path_without_cdn(): void
    {
        config([
            'family.media.cdn_url' => '',
            'bahram.media_url' => '',
            'bahram.arvan.media_domain' => '',
        ]);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'fake');

        $url = FamilyMediaUrl::fromPath($path, 'public');

        $this->assertSame('/storage/'.$path, $url);
    }

    public function test_cache_buster_appends_version_query(): void
    {
        $this->assertSame(
            '/storage/media/family/x.webp?v=3',
            FamilyMediaUrl::withCacheBuster('/storage/media/family/x.webp', 3),
        );
    }
}
