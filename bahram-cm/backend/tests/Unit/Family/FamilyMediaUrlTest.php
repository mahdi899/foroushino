<?php

namespace Tests\Unit\Family;

use App\Support\FamilyMediaUrl;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FamilyMediaUrlTest extends TestCase
{
    public function test_local_family_media_returns_relative_storage_path_without_cdn(): void
    {
        config(['family.media.cdn_url' => '']);
        config(['app.url' => 'http://localhost:3000']);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'fake');

        $url = FamilyMediaUrl::fromPath($path);

        $this->assertSame('/storage/'.$path, $url);
    }

    public function test_cdn_config_returns_absolute_cdn_url(): void
    {
        config(['family.media.cdn_url' => 'https://cdn.example.com']);

        $path = 'media/family/2026/07/image/demo.webp';
        $url = FamilyMediaUrl::fromPath($path);

        $this->assertSame('https://cdn.example.com/'.$path, $url);
    }

    public function test_cache_buster_appends_version_query(): void
    {
        $this->assertSame(
            '/storage/media/family/x.webp?v=3',
            FamilyMediaUrl::withCacheBuster('/storage/media/family/x.webp', 3),
        );
    }
}
