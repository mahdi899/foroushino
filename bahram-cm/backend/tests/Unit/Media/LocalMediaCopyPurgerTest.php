<?php

namespace Tests\Unit\Media;

use App\Models\FamilyMedia;
use App\Models\Media;
use App\Services\Media\LocalMediaCopyPurger;
use App\Support\MediaFtpConnection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LocalMediaCopyPurgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_purges_local_copy_when_site_media_is_on_remote_disk(): void
    {
        Storage::fake('public');
        $path = 'media/site/purge-me.webp';
        Storage::disk('public')->put($path, 'local-bytes');

        Media::create([
            'disk' => 'site_media_ftp',
            'path' => $path,
            'type' => 'image',
            'mime' => 'image/webp',
            'size' => 11,
            'is_private' => false,
            'keep_on_server' => false,
        ]);

        $stats = app(LocalMediaCopyPurger::class)->purge(50);

        $this->assertSame(1, $stats['purged']);
        $this->assertFalse(Storage::disk('public')->exists($path));
    }

    public function test_reconciles_family_media_when_remote_copy_exists(): void
    {
        $remoteRoot = storage_path('framework/testing/family-purge-remote');
        File::deleteDirectory($remoteRoot);
        File::makeDirectory($remoteRoot, 0755, true);

        config([
            'filesystems.disks.site_media_ftp' => [
                'driver' => 'local',
                'root' => $remoteRoot,
                'host' => 'ftp.test',
                'throw' => true,
            ],
        ]);

        MediaFtpConnection::save([
            'enabled' => true,
            'protocol' => 'ftp',
            'host' => 'ftp.test',
            'port' => 21,
            'username' => 'user',
            'password' => 'secret',
            'root' => '/',
        ]);

        Storage::fake('public');
        $path = 'media/family/2026/07/image/reconcile.webp';
        $bytes = 'remote-canonical';
        Storage::disk('public')->put($path, $bytes);
        Storage::disk('site_media_ftp')->put($path, $bytes);

        $family = FamilyMedia::create([
            'type' => 'image',
            'disk' => 'public',
            'storage_path' => $path,
            'mime_type' => 'image/webp',
            'size' => strlen($bytes),
            'status' => 'ready',
        ]);

        $stats = app(LocalMediaCopyPurger::class)->purge(50);

        $this->assertSame(1, $stats['reconciled']);
        $this->assertFalse(Storage::disk('public')->exists($path));
        $this->assertSame('site_media_ftp', $family->fresh()->disk);

        File::deleteDirectory($remoteRoot);
    }
}
