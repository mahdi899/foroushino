<?php

namespace Tests\Unit;

use App\Models\Setting;
use App\Services\MediaHostSettingsService;
use App\Support\FamilyMediaUrl;
use App\Support\MediaUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MediaHostSettingsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_imports_git_manifest_into_settings(): void
    {
        app(MediaHostSettingsService::class)->importFromManifest();
        MediaHostSettingsService::forgetCachedConfig();

        $stored = Setting::query()
            ->where('group', MediaHostSettingsService::GROUP)
            ->where('key', MediaHostSettingsService::KEY)
            ->value('value');

        $this->assertIsArray($stored);
        $this->assertSame('https://cdn.rostami.app', $stored['media_url']);
        $this->assertSame('https://cdn.rostami.app', $stored['family_media_cdn_url']);
    }

    public function test_media_url_prefers_database_over_env(): void
    {
        config(['bahram.media_url' => 'https://cdn.example.com']);

        app(MediaHostSettingsService::class)->update([
            'media_url' => 'https://cdn.rostami.app',
            'family_media_cdn_url' => 'https://cdn.rostami.app',
        ]);

        $this->assertSame('https://cdn.rostami.app', MediaUrl::mediaOrigin());
        $this->assertSame(
            'https://cdn.rostami.app/media/family/2026/07/image/demo.webp',
            FamilyMediaUrl::fromPath('media/family/2026/07/image/demo.webp', 'public'),
        );
    }

    public function test_family_cdn_rejects_club_proxy_from_database(): void
    {
        app(MediaHostSettingsService::class)->update([
            'media_url' => 'https://cdn.rostami.app',
            'family_media_cdn_url' => 'https://rostami.club',
        ]);

        $this->assertSame('https://cdn.rostami.app', app(MediaHostSettingsService::class)->familyMediaCdnUrl());
    }
}
