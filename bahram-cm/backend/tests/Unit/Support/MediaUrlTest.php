<?php

namespace Tests\Unit\Support;

use App\Support\MediaUrl;
use Tests\TestCase;

class MediaUrlTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'bahram.media_url' => 'https://cdn.example.com',
            'bahram.frontend_url' => 'https://rostami.app',
        ]);
    }

    public function test_gallery_storage_ref_uses_cdn_without_storage_prefix(): void
    {
        $url = MediaUrl::resolve('/storage/media/site/testimonial-01.webp');

        $this->assertSame('https://cdn.example.com/media/site/testimonial-01.webp', $url);
    }

    public function test_non_media_storage_ref_stays_on_site_origin_with_full_path(): void
    {
        $url = MediaUrl::resolve('/storage/articles/cover.jpg');

        $this->assertSame('https://rostami.app/storage/articles/cover.jpg', $url);
    }

    public function test_cdn_path_helper_only_strips_media_prefix(): void
    {
        $this->assertSame(
            '/media/site/logo.webp',
            MediaUrl::cdnPathFromStorageRef('/storage/media/site/logo.webp'),
        );
        $this->assertSame(
            '/storage/articles/cover.jpg',
            MediaUrl::cdnPathFromStorageRef('/storage/articles/cover.jpg'),
        );
    }

    public function test_gallery_storage_uses_arvan_media_domain_when_media_url_unset(): void
    {
        config([
            'bahram.media_url' => '',
            'bahram.arvan.media_domain' => 'cdn.rostami.app',
            'bahram.frontend_url' => 'http://localhost:3000',
        ]);

        $url = MediaUrl::resolve('/storage/media/site/logo.webp');

        $this->assertSame('https://cdn.rostami.app/media/site/logo.webp', $url);
    }
}
