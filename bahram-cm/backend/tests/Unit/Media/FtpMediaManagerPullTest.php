<?php

namespace Tests\Unit\Media;

use App\Models\Media;
use App\Services\Media\FtpMediaManager;
use App\Support\MediaFtpConnection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FtpMediaManagerPullTest extends TestCase
{
    use RefreshDatabase;

    public function test_pull_moves_file_to_local_and_deletes_remote_copy(): void
    {
        $remoteRoot = storage_path('framework/testing/ftp-pull-remote');
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

        $path = 'media/site/pull-test.jpg';
        $contents = 'remote-image-bytes';
        Storage::disk('site_media_ftp')->put($path, $contents);

        $media = Media::create([
            'disk' => 'site_media_ftp',
            'path' => $path,
            'type' => 'image',
            'mime' => 'image/jpeg',
            'size' => strlen($contents),
            'is_private' => false,
            'keep_on_server' => false,
        ]);

        $updated = app(FtpMediaManager::class)->pull($media);

        $this->assertSame('public', $updated->disk);
        $this->assertTrue((bool) $updated->keep_on_server);
        $this->assertTrue(Storage::disk('public')->exists($path));
        $this->assertSame($contents, Storage::disk('public')->get($path));
        $this->assertFalse(Storage::disk('site_media_ftp')->exists($path));

        Storage::disk('public')->delete($path);
        File::deleteDirectory($remoteRoot);
    }
}
