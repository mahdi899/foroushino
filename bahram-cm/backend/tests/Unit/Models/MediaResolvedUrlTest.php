<?php

namespace Tests\Unit\Models;

use App\Models\Media;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaResolvedUrlTest extends TestCase
{
    public function test_remote_disk_uses_cdn_when_local_copy_missing(): void
    {
        config(['bahram.media_url' => 'https://cdn.example.com']);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');

        $media = new Media([
            'disk' => 'site_media_ftp',
            'path' => $path,
            'is_private' => false,
        ]);

        $this->assertSame('https://cdn.example.com/'.$path, $media->resolvedUrl());
        $this->assertSame('/api/admin/media/'.$media->id.'/file', $media->adminStreamPath());
    }

    public function test_remote_disk_keeps_local_storage_when_public_copy_exists(): void
    {
        config(['bahram.media_url' => 'https://cdn.example.com']);

        $path = 'media/family/2026/07/image/demo.webp';
        Storage::fake('public');
        Storage::disk('public')->put($path, 'fake');

        $media = new Media([
            'disk' => 'site_media_ftp',
            'path' => $path,
            'is_private' => false,
        ]);

        $this->assertSame('https://cdn.example.com/'.$path, (string) $media->resolvedUrl());
    }
}
