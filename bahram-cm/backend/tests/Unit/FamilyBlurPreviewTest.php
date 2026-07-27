<?php

namespace Tests\Unit;

use App\Support\FamilyBlurPreview;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FamilyBlurPreviewTest extends TestCase
{
    #[Test]
    public function it_generates_a_tiny_blurred_webp_under_5kb(): void
    {
        if (! extension_loaded('gd') || ! function_exists('imagewebp')) {
            $this->markTestSkipped('GD + WebP required');
        }

        $source = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-blur-src-'.uniqid('', true).'.jpg';
        $dest = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-blur-dst-'.uniqid('', true).'.webp';

        $img = imagecreatetruecolor(1080, 1920);
        $green = imagecolorallocate($img, 20, 90, 60);
        imagefilledrectangle($img, 0, 0, 1079, 1919, $green);
        imagejpeg($img, $source, 90);
        imagedestroy($img);

        try {
            $this->assertTrue(FamilyBlurPreview::generateFromPath($source, $dest));
            $this->assertFileExists($dest);
            $size = filesize($dest);
            $this->assertGreaterThan(0, $size);
            $this->assertLessThanOrEqual(FamilyBlurPreview::MAX_BYTES, $size);
            $this->assertSame(
                'media/family/demo/demo-story-vertical_preview.webp',
                FamilyBlurPreview::relativePathFor('media/family/demo/demo-story-vertical.webp'),
            );
        } finally {
            @unlink($source);
            @unlink($dest);
        }
    }
}
