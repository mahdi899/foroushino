<?php

namespace Tests\Unit\Support;

use App\Support\DirectoryListingGuard;
use Illuminate\Support\Facades\File;
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
}
