<?php

namespace Tests\Unit\Family;

use App\Services\ImageOptimizerService;
use ReflectionMethod;
use Tests\TestCase;

class ImageOptimizerStandaloneTest extends TestCase
{
    public function test_finalize_standalone_keeps_smaller_original_and_deletes_larger_optimized(): void
    {
        $dir = sys_get_temp_dir().'/family-opt-'.uniqid('', true);
        mkdir($dir);

        $original = $dir.'/photo.jpg';
        $optimized = $dir.'/photo.webp';
        file_put_contents($original, str_repeat('a', 120));
        file_put_contents($optimized, str_repeat('b', 240));

        $service = app(ImageOptimizerService::class);
        $method = new ReflectionMethod(ImageOptimizerService::class, 'finalizeStandaloneOptimization');
        $method->setAccessible(true);

        /** @var array{kept: string, path: string, size: int} $result */
        $result = $method->invoke($service, $original, $optimized, [
            'engine' => 'resmush',
            'converted_to_webp' => true,
            'size' => 240,
            'mime' => 'image/webp',
        ]);

        $this->assertSame('original', $result['kept']);
        $this->assertSame($original, $result['path']);
        $this->assertSame(120, $result['size']);
        $this->assertFileDoesNotExist($optimized);

        @unlink($original);
        @rmdir($dir);
    }

    public function test_finalize_standalone_keeps_smaller_optimized_variant(): void
    {
        $dir = sys_get_temp_dir().'/family-opt-'.uniqid('', true);
        mkdir($dir);

        $original = $dir.'/photo.jpg';
        $optimized = $dir.'/photo.webp';
        file_put_contents($original, str_repeat('a', 240));
        file_put_contents($optimized, str_repeat('b', 80));

        $service = app(ImageOptimizerService::class);
        $method = new ReflectionMethod(ImageOptimizerService::class, 'finalizeStandaloneOptimization');
        $method->setAccessible(true);

        /** @var array{kept: string, path: string, size: int, mime: string} $result */
        $result = $method->invoke($service, $original, $optimized, [
            'engine' => 'tinify',
            'converted_to_webp' => true,
            'size' => 80,
            'mime' => 'image/webp',
        ]);

        $this->assertSame('optimized', $result['kept']);
        $this->assertSame($optimized, $result['path']);
        $this->assertSame(80, $result['size']);
        $this->assertFileExists($original);

        @unlink($original);
        @unlink($optimized);
        @rmdir($dir);
    }

    public function test_pick_smallest_candidate_prefers_lower_size(): void
    {
        $service = app(ImageOptimizerService::class);
        $method = new ReflectionMethod(ImageOptimizerService::class, 'pickSmallestCandidate');
        $method->setAccessible(true);

        /** @var array{engine: string, size: int} $winner */
        $winner = $method->invoke($service, [
            ['engine' => 'resmush', 'converted_to_webp' => false, 'size' => 120, 'mime' => 'image/jpeg', 'path' => '/tmp/a.jpg'],
            ['engine' => 'gd', 'converted_to_webp' => true, 'size' => 80, 'mime' => 'image/webp', 'path' => '/tmp/a.webp'],
            ['engine' => 'tinify', 'converted_to_webp' => true, 'size' => 95, 'mime' => 'image/webp', 'path' => '/tmp/b.webp'],
        ]);

        $this->assertSame('gd', $winner['engine']);
        $this->assertSame(80, $winner['size']);
    }

    public function test_pick_smallest_candidate_prefers_gd_on_tie(): void
    {
        $service = app(ImageOptimizerService::class);
        $method = new ReflectionMethod(ImageOptimizerService::class, 'pickSmallestCandidate');
        $method->setAccessible(true);

        /** @var array{engine: string, size: int} $winner */
        $winner = $method->invoke($service, [
            ['engine' => 'resmush', 'converted_to_webp' => false, 'size' => 100, 'mime' => 'image/jpeg', 'path' => '/tmp/a.jpg'],
            ['engine' => 'gd', 'converted_to_webp' => true, 'size' => 100, 'mime' => 'image/webp', 'path' => '/tmp/a.webp'],
        ]);

        $this->assertSame('gd', $winner['engine']);
    }
}
