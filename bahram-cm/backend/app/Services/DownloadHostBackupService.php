<?php

namespace App\Services;

use App\Support\MediaFtpConnection;
use App\Support\MediaUrl;
use Carbon\Carbon;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
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

    /**
     * Upload an existing local database dump to a new dated folder on the download host.
     * Never overwrites a previous backup folder — each run gets its own date (or date_time) folder.
     *
     * @return array{ok: bool, message: string, manifest?: array<string, mixed>, folder?: string}
     */
    public function uploadDatabaseArtifact(string $localPath, int $sizeBytes, string $originalFilename): array
    {
        try {
            $this->assertConfigured();

            if (! is_file($localPath)) {
                throw new RuntimeException('فایل بکاپ محلی یافت نشد.');
            }

            $disk = $this->remoteDisk();
            $siteSlug = $this->siteSlug();
            $folderName = $this->resolveDatedFolderName($disk, $siteSlug);
            $remoteDir = $this->remoteDirectory($siteSlug, $folderName);

            $dbRemote = $remoteDir.'/database.sql.gz';
            $this->uploadLocalFile($disk, $localPath, $dbRemote, allowReplace: false);

            $manifest = [
                'site' => $siteSlug,
                'id' => $folderName,
                'backup_date' => $folderName,
                'created_at' => now()->toIso8601String(),
                'source_filename' => $originalFilename,
                'files' => [
                    'database' => $this->fileEntry('database.sql.gz', $dbRemote, $sizeBytes),
                ],
            ];

            $disk->put(
                $remoteDir.'/manifest.json',
                json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            );

            $this->writeLocalManifest($manifest);
            $this->pruneRemoteBackups($disk, $siteSlug);

            return [
                'ok' => true,
                'message' => "پوشه {$folderName} روی هاست دانلود ساخته شد.",
                'manifest' => $manifest,
                'folder' => $folderName,
            ];
        } catch (Throwable $e) {
            Log::error('Download-host database upload failed.', ['message' => $e->getMessage()]);

            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    /** @return array{ok: bool, message: string, manifest?: array<string, mixed>} */
    public function uploadWeeklyBackup(bool $force = false): array
    {
        if (! $force && ! $this->isWeeklyBackupDay()) {
            return ['ok' => true, 'message' => 'امروز روز بکاپ هفتگی media روی هاست دانلود نیست.'];
        }

        try {
            $this->assertConfigured();
            $disk = $this->remoteDisk();
            $siteSlug = $this->siteSlug();
            $folderName = $this->resolveDatedFolderName($disk, $siteSlug);
            $remoteDir = $this->remoteDirectory($siteSlug, $folderName);

            $mediaArtifact = $this->databaseBackup->createMediaArtifact();
            $filesRemote = $remoteDir.'/'.$mediaArtifact['filename'];

            $this->uploadLocalFile($disk, $mediaArtifact['path'], $filesRemote, allowReplace: false);

            $manifest = $this->readRemoteManifest($disk, $remoteDir) ?? [
                'site' => $siteSlug,
                'id' => $folderName,
                'backup_date' => $folderName,
                'created_at' => now()->toIso8601String(),
                'files' => [],
            ];

            $manifest['id'] = $folderName;
            $manifest['backup_date'] = $folderName;
            $manifest['files']['media'] = $this->fileEntry(
                $mediaArtifact['filename'],
                $filesRemote,
                $mediaArtifact['size_bytes'],
            );

            $disk->put(
                $remoteDir.'/manifest.json',
                json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            );

            $this->writeLocalManifest($manifest);
            $this->pruneRemoteBackups($disk, $siteSlug);

            @unlink($mediaArtifact['path']);

            return [
                'ok' => true,
                'message' => "بکاپ media در پوشه {$folderName} روی هاست دانلود آپلود شد.",
                'manifest' => $manifest,
            ];
        } catch (Throwable $e) {
            Log::error('Download-host weekly media upload failed.', ['message' => $e->getMessage()]);

            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    public function isWeeklyBackupDay(): bool
    {
        $target = (string) config('bahram.backup.download_host.weekday', '0');

        return now()->format('w') === $target;
    }

    public function resolveDatedFolderName(Filesystem $disk, string $siteSlug): string
    {
        $date = now()->format('Y-m-d');

        if (! $this->remoteDirectoryExists($disk, $siteSlug, $date)) {
            return $date;
        }

        return $date.'_'.now()->format('His');
    }

    public function parseFolderBackupDate(string $folderName): ?Carbon
    {
        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $folderName, $matches) !== 1) {
            return null;
        }

        try {
            return Carbon::parse($matches[1])->startOfDay();
        } catch (Throwable) {
            return null;
        }
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

    private function uploadLocalFile(
        Filesystem $disk,
        string $localPath,
        string $remotePath,
        bool $allowReplace = false,
    ): void {
        if (! is_file($localPath)) {
            throw new RuntimeException("فایل محلی یافت نشد: {$localPath}");
        }

        if (! $allowReplace && $disk->exists($remotePath)) {
            throw new RuntimeException("فایل remote از قبل وجود دارد و جایگزین نمی‌شود: {$remotePath}");
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

            if ($allowReplace && $disk->exists($remotePath)) {
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

        $cutoff = now()->subDays($this->retentionDays())->startOfDay();

        foreach ($disk->directories($base) as $directory) {
            $folderName = basename(str_replace('\\', '/', $directory));
            $backupDate = $this->parseFolderBackupDate($folderName);

            if ($backupDate === null) {
                $backupDate = $this->manifestCreatedAt($disk, $directory);
            }

            if ($backupDate === null || $backupDate->greaterThanOrEqualTo($cutoff)) {
                continue;
            }

            $this->deleteRemoteDirectory($disk, $directory);
        }
    }

    private function manifestCreatedAt(Filesystem $disk, string $directory): ?Carbon
    {
        $manifestPath = $directory.'/manifest.json';
        if (! $disk->exists($manifestPath)) {
            return null;
        }

        try {
            $manifest = json_decode((string) $disk->get($manifestPath), true, 512, JSON_THROW_ON_ERROR);

            return Carbon::parse((string) ($manifest['created_at'] ?? ''));
        } catch (Throwable) {
            return null;
        }
    }

    /** @return array<string, mixed>|null */
    private function readRemoteManifest(Filesystem $disk, string $remoteDir): ?array
    {
        $manifestPath = $remoteDir.'/manifest.json';
        if (! $disk->exists($manifestPath)) {
            return null;
        }

        try {
            $decoded = json_decode((string) $disk->get($manifestPath), true, 512, JSON_THROW_ON_ERROR);

            return is_array($decoded) ? $decoded : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function deleteRemoteDirectory(Filesystem $disk, string $directory): void
    {
        foreach ($disk->allFiles($directory) as $file) {
            $disk->delete($file);
        }

        if (method_exists($disk, 'deleteDirectory')) {
            $disk->deleteDirectory($directory);
        }
    }

    private function remoteDirectoryExists(Filesystem $disk, string $siteSlug, string $folderName): bool
    {
        $path = $this->remoteDirectory($siteSlug, $folderName);

        return $disk->exists($path) || $disk->directories($path) !== [] || $disk->allFiles($path) !== [];
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

    private function remoteDirectory(string $siteSlug, string $folderName): string
    {
        return $this->basePath().'/'.$siteSlug.'/'.$folderName;
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
        return max(1, (int) config('bahram.backup.download_host.retention_days', 30));
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
