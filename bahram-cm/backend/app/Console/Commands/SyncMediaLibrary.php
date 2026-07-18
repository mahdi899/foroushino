<?php

namespace App\Console\Commands;

use App\Enums\MediaType;
use App\Models\Media;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class SyncMediaLibrary extends Command
{
    private const INDEXABLE_EXTENSIONS = ['svg', 'webp', 'png', 'jpg', 'jpeg', 'gif', 'json', 'mp4', 'webm', 'mp3', 'm4a', 'ogg'];

    protected $signature = 'media:sync
        {--export : Write database/media_library.json from the media table}
        {--import : Apply database/media_library.json into the database (default when not exporting)}
        {--include-remote : Also scan the configured download host (FTP/SFTP) for unindexed files — full recursive listing, slower, run occasionally rather than on every deploy}';

    protected $description = 'Sync the media library between git-tracked files, JSON manifest, and the database';

  private const MANIFEST = 'database/data/media_library.json';

    public function handle(): int
    {
        if ($this->option('export')) {
            return $this->exportManifest();
        }

        return $this->importManifest();
    }

    private function manifestPath(): string
    {
        return base_path(self::MANIFEST);
    }

    private function exportManifest(): int
    {
        $items = Media::query()
            ->orderBy('id')
            ->get()
            ->map(fn (Media $m) => [
                'path' => $m->path,
                'disk' => $m->disk,
                'url' => $m->url,
                'type' => $m->type?->value ?? 'image',
                'mime' => $m->mime,
                'size' => $m->size,
                'width' => $m->width,
                'height' => $m->height,
                'alt_fa' => $m->alt_fa,
                'original_filename' => $m->original_filename,
                'category' => $m->category,
                'legacy_path' => $m->legacy_path,
                'is_private' => (bool) $m->is_private,
            ])
            ->values()
            ->all();

        File::ensureDirectoryExists(dirname($this->manifestPath()));
        File::put(
            $this->manifestPath(),
            json_encode(['version' => 1, 'items' => $items], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n",
        );

        $this->info('Exported '.count($items).' media records to '.self::MANIFEST);
        $this->call('media:export-legacy-map');

        return self::SUCCESS;
    }

    private function importManifest(): int
    {
        $manifestItems = $this->loadManifest();
        $imported = 0;
        $indexed = 0;

        foreach ($manifestItems as $row) {
            if (blank($row['path'] ?? null)) {
                continue;
            }

            Media::query()->updateOrCreate(
                ['path' => $row['path']],
                [
                    'disk' => $row['disk'] ?? 'public',
                    'url' => $row['url'] ?? null,
                    'type' => $row['type'] ?? MediaType::Image->value,
                    'mime' => $row['mime'] ?? null,
                    'size' => $row['size'] ?? null,
                    'width' => $row['width'] ?? null,
                    'height' => $row['height'] ?? null,
                    'alt_fa' => $row['alt_fa'] ?? null,
                    'original_filename' => $row['original_filename'] ?? basename((string) $row['path']),
                    'category' => $row['category'] ?? 'آپلود شده',
                    'legacy_path' => $row['legacy_path'] ?? null,
                    'is_private' => (bool) ($row['is_private'] ?? false),
                ],
            );
            $imported++;
        }

        $mediaRoot = storage_path('app/public/media');
        if (! is_dir($mediaRoot)) {
            $this->warn('No media files directory yet: storage/app/public/media');

            return self::SUCCESS;
        }

        foreach (File::allFiles($mediaRoot) as $file) {
            $relative = 'media/'.str_replace('\\', '/', $file->getRelativePathname());
            if (Media::query()->where('path', $relative)->exists()) {
                continue;
            }

            $ext = strtolower($file->getExtension());
            if (! in_array($ext, self::INDEXABLE_EXTENSIONS, true)) {
                continue;
            }

            Media::query()->create([
                'disk' => 'public',
                'path' => $relative,
                'url' => null,
                'type' => $this->typeFromExtension($ext),
                'mime' => $this->mimeFromExtension($ext),
                'size' => $file->getSize(),
                'alt_fa' => str_replace(['-', '_'], ' ', pathinfo($file->getFilename(), PATHINFO_FILENAME)),
                'original_filename' => $file->getFilename(),
                'category' => match (true) {
                    str_starts_with($relative, 'media/site/') => 'سایت',
                    str_starts_with($relative, 'media/family/') => 'خانواده',
                    default => 'آپلود شده',
                },
                'is_private' => false,
            ]);
            $indexed++;
        }

        if ($this->option('include-remote')) {
            $remoteIndexed = $this->importFromRemoteDisk();
            $indexed += $remoteIndexed;
            if ($remoteIndexed > 0) {
                $this->info("Indexed {$remoteIndexed} new file(s) from the remote download host.");
            }
        }

        $this->call('media:export-legacy-map');

        $this->info("Imported {$imported} manifest row(s); indexed {$indexed} new file(s) from disk.");

        return self::SUCCESS;
    }

    /**
     * Scans the configured download host (site_media_ftp / site_media_sftp)
     * for files not yet present in the `media` table. Deliberately opt-in
     * via --include-remote — a full recursive FTP/SFTP listing is far
     * slower than the local filesystem scan above and should be run
     * occasionally (e.g. a nightly scheduled task), not on every deploy.
     */
    private function importFromRemoteDisk(): int
    {
        $diskName = (string) config('bahram.uploads.public_disk', 'public');
        $driver = (string) config("filesystems.disks.{$diskName}.driver", 'local');

        if (! in_array($driver, ['ftp', 'sftp'], true) || ! filled(config("filesystems.disks.{$diskName}.host"))) {
            return 0;
        }

        $disk = Storage::disk($diskName);

        try {
            $files = $disk->allFiles('media');
        } catch (\Throwable $e) {
            $this->warn('Unable to list the remote download host: '.$e->getMessage());

            return 0;
        }

        $indexed = 0;

        foreach ($files as $file) {
            $relative = str_replace('\\', '/', $file);

            if (str_ends_with($relative, '.part')) {
                continue;
            }

            $ext = strtolower(pathinfo($relative, PATHINFO_EXTENSION));
            if (! in_array($ext, self::INDEXABLE_EXTENSIONS, true)) {
                continue;
            }

            if (Media::query()->where('path', $relative)->exists()) {
                continue;
            }

            $size = null;
            try {
                $size = $disk->size($relative);
            } catch (\Throwable) {
                // Non-fatal — size lookup can fail transiently over FTP/SFTP.
            }

            Media::query()->create([
                'disk' => $diskName,
                'path' => $relative,
                'url' => null,
                'type' => $this->typeFromExtension($ext),
                'mime' => $this->mimeFromExtension($ext),
                'size' => $size,
                'alt_fa' => str_replace(['-', '_'], ' ', pathinfo(basename($relative), PATHINFO_FILENAME)),
                'original_filename' => basename($relative),
                'category' => match (true) {
                    str_starts_with($relative, 'media/site/') => 'سایت',
                    str_starts_with($relative, 'media/family/') => 'خانواده',
                    default => 'آپلود شده',
                },
                'is_private' => false,
            ]);
            $indexed++;
        }

        return $indexed;
    }

    /** @return list<array<string, mixed>> */
    private function loadManifest(): array
    {
        $path = $this->manifestPath();
        if (! File::exists($path)) {
            $this->warn('Manifest not found ('.self::MANIFEST.') — indexing files from disk only.');

            return [];
        }

        $decoded = json_decode(File::get($path), true);
        if (! is_array($decoded)) {
            $this->error('Invalid manifest JSON.');

            return [];
        }

        return is_array($decoded['items'] ?? null) ? $decoded['items'] : [];
    }

    private function typeFromExtension(string $ext): string
    {
        return match ($ext) {
            'mp4', 'webm' => MediaType::Video->value,
            'json' => MediaType::Lottie->value,
            'mp3', 'm4a', 'ogg' => MediaType::Document->value,
            default => MediaType::Image->value,
        };
    }

    private function mimeFromExtension(string $ext): string
    {
        return match ($ext) {
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'json' => 'application/json',
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'mp3' => 'audio/mpeg',
            'm4a' => 'audio/mp4',
            'ogg' => 'audio/ogg',
            default => 'image/jpeg',
        };
    }
}
