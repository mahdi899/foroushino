<?php

namespace App\Console\Commands;

use App\Models\Media;
use App\Support\LegacyMediaMap;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ImportSiteMedia extends Command
{
    protected $signature = 'media:import-site {--force : Re-import existing paths}';

    protected $description = 'Import /public/media static assets into the media library';

    public function handle(): int
    {
        $publicMedia = dirname(base_path()).'/frontend/public/media';
        if (! is_dir($publicMedia)) {
            $this->error('public/media directory not found');

            return self::FAILURE;
        }

        $imported = 0;
        foreach (File::allFiles($publicMedia) as $file) {
            $ext = strtolower($file->getExtension());
            if (! in_array($ext, ['svg', 'webp', 'png', 'jpg', 'jpeg', 'gif'], true)) {
                continue;
            }

            $relative = '/media/'.str_replace('\\', '/', $file->getRelativePathname());
            $legacy = $relative;

            $exists = Media::query()->where('legacy_path', $legacy)->orWhere('path', 'like', '%'.$file->getFilename())->first();
            if ($exists && ! $this->option('force')) {
                continue;
            }

            $destDir = 'media/site';
            $filename = $file->getFilename();
            $storagePath = $destDir.'/'.$filename;

            if (! File::exists(storage_path('app/public/'.$storagePath))) {
                File::ensureDirectoryExists(storage_path('app/public/'.$destDir));
                File::copy($file->getPathname(), storage_path('app/public/'.$storagePath));
            }

            $label = pathinfo($filename, PATHINFO_FILENAME);
            $category = 'سایت';
            if (str_contains($relative, '/site-photos/')) {
                $category = 'عکس‌های سایت';
            } elseif (str_ends_with($ext, 'svg')) {
                $category = 'آیکون و برند';
            }

            Media::query()->updateOrCreate(
                ['legacy_path' => $legacy],
                [
                    'disk' => 'public',
                    'path' => $storagePath,
                    'url' => '/storage/'.$storagePath,
                    'type' => 'image',
                    'mime' => match ($ext) {
                        'svg' => 'image/svg+xml',
                        'webp' => 'image/webp',
                        'png' => 'image/png',
                        'gif' => 'image/gif',
                        default => 'image/jpeg',
                    },
                    'size' => $file->getSize(),
                    'alt_fa' => str_replace(['-', '_'], ' ', $label),
                    'original_filename' => $filename,
                    'category' => $category,
                    'is_private' => false,
                ],
            );

            $imported++;
        }

        LegacyMediaMap::flush();
        $this->call('media:export-legacy-map');

        $this->info("Imported {$imported} site media files.");

        return self::SUCCESS;
    }
}
