<?php

namespace Tests\Unit\Support;

use App\Support\DirectoryListingGuard;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DirectoryListingGuardTest extends TestCase
{
    public function test_guard_public_relative_path_creates_index_chain(): void
    {
        $root = storage_path('app/public/media/guard-test');
        File::deleteDirectory($root);

        DirectoryListingGuard::guardPublicRelativePath('media/guard-test/2026/07/sample.webp');

        $this->assertFileExists($root.'/index.html');
        $this->assertFileExists($root.'/2026/index.html');
        $this->assertFileExists($root.'/2026/07/index.html');
        $this->assertSame(
            DirectoryListingGuard::indexContents(),
            file_get_contents($root.'/2026/07/index.html'),
        );

        File::deleteDirectory($root);
        File::deleteDirectory(storage_path('app/public/media/guard-test'));
    }

    public function test_guard_storage_path_on_local_disk_writes_index_files(): void
    {
        $root = storage_path('app/public/media/guard-storage-test');
        File::deleteDirectory($root);

        DirectoryListingGuard::guardStoragePath(Storage::disk('public'), 'media/guard-storage-test/2026/07/sample.webp');

        $this->assertFileExists($root.'/index.html');
        $this->assertFileExists($root.'/2026/index.html');
        $this->assertFileExists($root.'/2026/07/index.html');

        File::deleteDirectory($root);
    }

    public function test_guard_storage_path_on_remote_disk_writes_index_files(): void
    {
        $written = [];

        $adapter = \Mockery::mock(\League\Flysystem\FilesystemAdapter::class);
        $adapter->shouldReceive('fileExists')
            ->andReturnUsing(static fn (string $path): bool => array_key_exists($path, $written));
        $adapter->shouldReceive('write')
            ->andReturnUsing(function (string $path, string $contents) use (&$written): void {
                $written[$path] = $contents;
            });
        $adapter->shouldReceive('directoryExists')->andReturn(false);
        $adapter->shouldReceive('createDirectory')->andReturnNull();

        $remote = new \Illuminate\Filesystem\FilesystemAdapter(
            new \League\Flysystem\Filesystem($adapter),
            $adapter,
            ['driver' => 'ftp'],
        );

        DirectoryListingGuard::guardStoragePath($remote, 'media/site/2026/07/sample.webp');

        $this->assertArrayHasKey('media/index.html', $written);
        $this->assertArrayHasKey('media/site/index.html', $written);
        $this->assertArrayHasKey('media/site/2026/index.html', $written);
        $this->assertArrayHasKey('media/site/2026/07/index.html', $written);
        $this->assertSame(
            DirectoryListingGuard::indexContents(),
            $written['media/site/2026/07/index.html'],
        );
    }
}
