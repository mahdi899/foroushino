<?php

namespace App\Services;

use App\Support\MediaFtpConnection;
use App\Support\MediaUrl;
use Carbon\Carbon;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class DownloadHostBackupService
{
    private const REMOTE_DISK = 'backup_download_host';

    public function __construct(private readonly DatabaseBackupService $databaseBackup) {}

    /** @return array<string, mixed> */
    public function adminSnapshot(): array
    {
        $manifest = $this->readLocalManifest();

        return [
            'download_host_configured' => $this->isConfigured(),
            'download_host_cdn_url' => $this->cdnBaseUrl(),
            'last_offsite_backup_at' => $manifest['created_at'] ?? null,
            'last_offsite_backup_id' => $manifest['id'] ?? null,
            'last_offsite_links' => $manifest['files'] ?? [],
            'offsite_retention_days' => $this->retentionDays(),
        ];
    }

    public function isConfigured(): bool
    {
        try {
            $this->assertConfigured();

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    /** @return array{ok: bool, message: string, manifest?: array<string, mixed>} */
    public function uploadWeeklyBackup(bool $force = false): array
    {
        if (! $force && ! $this->isWeeklyBackupDay()) {
            return ['ok' => true, 'message' => 'امروز روز بکاپ هفتگی هاست دانلود نیست.'];
        }

        try {
            $this->assertConfigured();
            $disk = $this->remoteDisk();

            $siteSlug = $this->siteSlug();
            $folderId = Str::lower(Str::random(32));
            $remoteDir = $this->remoteDirectory($siteSlug, $folderId);

            $dbArtifact = $this->databaseBackup->createDumpArtifact();
            $mediaArtifact = $this->databaseBackup->createMediaArtifact();

            $dbRemote = $remoteDir.'/database.sql.gz';
            $filesRemote = $remoteDir.'/'.$mediaArtifact['filename'];

            $this->uploadLocalFile($disk, $dbArtifact['path'], $dbRemote);
            $this->uploadLocalFile($disk, $mediaArtifact['path'], $filesRemote);

            $manifest = [
                'site' => $siteSlug,
                'id' => $folderId,
                'created_at' => now()->toIso8601String(),
                'files' => [
                    'database' => $this->fileEntry('database.sql.gz', $dbRemote, $dbArtifact['size_bytes']),
                    'files' => $this->fileEntry($mediaArtifact['filename'], $filesRemote, $mediaArtifact['size_bytes']),
                ],
            ];

            $disk->put($remoteDir.'/manifest.json', json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

            $this->writeLocalManifest($manifest);
            $this->pruneRemoteBackups($disk, $siteSlug);

            @unlink($dbArtifact['path']);
            @unlink($mediaArtifact['path']);

            return [
                'ok' => true,
                'message' => 'بکاپ هفتگی روی هاست دانلود آپلود شد.',
                'manifest' => $manifest,
            ];
        } catch (Throwable $e) {
            Log::error('Download-host backup upload failed.', ['message' => $e->getMessage()]);

            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    public function isWeeklyBackupDay(): bool
    {
        $target = (string) config('bahram.backup.download_host.weekday', '0');

        return now()->format('w') === $target;
    }

    private function assertConfigured(): void
    {
        if (! extension_loaded('ftp') && ! $this->usesSftp()) {
            throw new RuntimeException('افزونه ext-ftp روی سرور فعال نیست.');
        }

        if (MediaFtpConnection::isReady()) {
            return;
        }

        $host = trim((string) config('bahram.backup.download_host.host', ''));

        if ($host === '') {
            throw new RuntimeException('هاست دانلود برای بکاپ پیکربندی نشده است (پنل رسانه یا BACKUP_FTP_HOST).');
        }
    }

    private function usesSftp(): bool
    {
        if (MediaFtpConnection::isReady()) {
            return MediaFtpConnection::get()['protocol'] === 'sftp';
        }

        return strtolower((string) config('bahram.backup.download_host.protocol', 'ftp')) === 'sftp';
    }

    private function remoteDisk(): Filesystem
    {
        if (MediaFtpConnection::isReady()) {
            return Storage::disk(MediaFtpConnection::diskName());
        }

        $diskConfig = [
            'driver' => $this->usesSftp() ? 'sftp' : 'ftp',
            'host' => (string) config('bahram.backup.download_host.host'),
            'username' => (string) config('bahram.backup.download_host.username'),
            'password' => (string) config('bahram.backup.download_host.password', ''),
            'port' => (int) config('bahram.backup.download_host.port', $this->usesSftp() ? 22 : 21),
            'root' => (string) config('bahram.backup.download_host.root', '/'),
            'passive' => filter_var(config('bahram.backup.download_host.passive', true), FILTER_VALIDATE_BOOL),
            'ssl' => filter_var(config('bahram.backup.download_host.ssl', false), FILTER_VALIDATE_BOOL),
            'timeout' => (int) config('bahram.backup.download_host.timeout', 120),
            'throw' => true,
        ];

        config(['filesystems.disks.'.self::REMOTE_DISK => $diskConfig]);

        return Storage::disk(self::REMOTE_DISK);
    }

    private function uploadLocalFile(Filesystem $disk, string $localPath, string $remotePath): void
    {
        if (! is_file($localPath)) {
            throw new RuntimeException("فایل محلی یافت نشد: {$localPath}");
        }

        $stream = fopen($localPath, 'rb');
        if ($stream === false) {
            throw new RuntimeException("خواندن فایل محلی ناموفق بود: {$localPath}");
        }

        try {
            $partPath = $remotePath.'.part';
            $disk->writeStream($partPath, $stream);
            if (is_resource($stream)) {
                fclose($stream);
                $stream = null;
            }

            if ($disk->exists($remotePath)) {
                $disk->delete($remotePath);
            }

            if (method_exists($disk, 'move')) {
                $disk->move($partPath, $remotePath);
            } else {
                $disk->copy($partPath, $remotePath);
                $disk->delete($partPath);
            }
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    private function pruneRemoteBackups(Filesystem $disk, string $siteSlug): void
    {
        $base = $this->basePath().'/'.$siteSlug;
        if (! $this->remoteExists($disk, $base)) {
            return;
        }

        $cutoff = now()->subDays($this->retentionDays());

        foreach ($disk->directories($base) as $directory) {
            $manifestPath = $directory.'/manifest.json';
            if (! $disk->exists($manifestPath)) {
                continue;
            }

            try {
                $manifest = json_decode((string) $disk->get($manifestPath), true, 512, JSON_THROW_ON_ERROR);
                $createdAt = Carbon::parse((string) ($manifest['created_at'] ?? ''));
            } catch (Throwable) {
                continue;
            }

            if ($createdAt->greaterThan($cutoff)) {
                continue;
            }

            foreach ($disk->allFiles($directory) as $file) {
                $disk->delete($file);
            }

            if (method_exists($disk, 'deleteDirectory')) {
                $disk->deleteDirectory($directory);
            }
        }
    }

    private function remoteExists(Filesystem $disk, string $path): bool
    {
        try {
            return $disk->exists($path) || $disk->directories($path) !== [];
        } catch (Throwable) {
            return false;
        }
    }

    /** @return array{name: string, path: string, size_bytes: int, url: string} */
    private function fileEntry(string $name, string $remotePath, int $sizeBytes): array
    {
        $cdn = rtrim($this->cdnBaseUrl(), '/');
        $urlPath = ltrim(str_replace('\\', '/', $remotePath), '/');

        return [
            'name' => $name,
            'path' => $remotePath,
            'size_bytes' => $sizeBytes,
            'url' => $cdn !== '' ? $cdn.'/'.$urlPath : $urlPath,
        ];
    }

    private function remoteDirectory(string $siteSlug, string $folderId): string
    {
        return $this->basePath().'/'.$siteSlug.'/'.$folderId;
    }

    private function basePath(): string
    {
        return trim((string) config('bahram.backup.download_host.base_path', 'backups'), '/');
    }

    private function siteSlug(): string
    {
        return trim((string) config('bahram.backup.download_host.site_slug', 'bahram'), '/');
    }

    private function retentionDays(): int
    {
        return max(1, (int) config('bahram.backup.download_host.retention_days', 90));
    }

    private function cdnBaseUrl(): string
    {
        $configured = trim((string) config('bahram.backup.download_host.cdn_url', ''));
        if ($configured !== '') {
            return rtrim($configured, '/');
        }

        return rtrim((string) (MediaUrl::mediaOrigin() ?? ''), '/');
    }

    /** @return array<string, mixed> */
    private function readLocalManifest(): array
    {
        $path = $this->localManifestPath();
        if (! is_file($path)) {
            return [];
        }

        try {
            $decoded = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

            return is_array($decoded) ? $decoded : [];
        } catch (Throwable) {
            return [];
        }
    }

    /** @param  array<string, mixed>  $manifest */
    private function writeLocalManifest(array $manifest): void
    {
        File::ensureDirectoryExists(dirname($this->localManifestPath()));
        file_put_contents($this->localManifestPath(), json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }

    private function localManifestPath(): string
    {
        return storage_path('app/backups/download-host/latest.json');
    }
}
