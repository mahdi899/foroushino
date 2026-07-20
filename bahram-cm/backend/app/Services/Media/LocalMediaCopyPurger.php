<?php

namespace App\Services\Media;

use App\Models\FamilyMedia;
use App\Models\Media;
use App\Support\FamilyMediaStorage;
use App\Support\MediaFtpConnection;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * Deletes origin-server copies once the download host (FTP/CDN) is canonical.
 * Applies to Bahram site library (`media` table) and Family uploads (`family_media`).
 */
class LocalMediaCopyPurger
{
    /** @var list<string> */
    private const LOCAL_DISKS = ['public', 'local'];

    /**
     * @return array{
     *     purged: int,
     *     reconciled: int,
     *     skipped: int,
     *     failed: int,
     *     errors: list<array{scope: string, id: int, path: string, message: string}>
     * }
     */
    public function purge(int $limit = 200, bool $dryRun = false): array
    {
        $limit = max(1, min($limit, 500));
        $stats = [
            'purged' => 0,
            'reconciled' => 0,
            'skipped' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        $remoteReady = MediaFtpConnection::isReady();
        $remote = $remoteReady ? Storage::disk(MediaFtpConnection::diskName()) : null;
        $remoteDiskName = $remoteReady ? MediaFtpConnection::diskName() : null;

        Media::query()
            ->where('is_private', false)
            ->whereNotNull('path')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->each(function (Media $media) use ($dryRun, $remote, $remoteDiskName, $remoteReady, &$stats): void {
                if ($this->isRemoteDisk($media->disk)) {
                    $this->purgePaths('site', $media->id, [$media->path], $dryRun, $stats);

                    return;
                }

                if (! $remoteReady || $media->keep_on_server || ! $remote instanceof Filesystem) {
                    $stats['skipped']++;

                    return;
                }

                if (! $remote->exists($media->path)) {
                    $stats['skipped']++;

                    return;
                }

                if (! FamilyMediaStorage::localPublicCopyExists($media->path)) {
                    $stats['skipped']++;

                    return;
                }

                $local = Storage::disk($media->disk);
                if (! $local->exists($media->path)) {
                    $stats['skipped']++;

                    return;
                }

                $remoteSize = $this->safeSize($remote, $media->path);
                $localSize = $this->safeSize($local, $media->path);
                if ($remoteSize === null || $localSize === null || $remoteSize !== $localSize) {
                    $stats['skipped']++;

                    return;
                }

                if ($dryRun) {
                    $stats['reconciled']++;

                    return;
                }

                try {
                    FamilyMediaStorage::purgeLocalPublicCopy($media->path);
                    $media->update([
                        'disk' => $remoteDiskName,
                        'keep_on_server' => false,
                    ]);
                    $stats['reconciled']++;
                } catch (\Throwable $e) {
                    $stats['failed']++;
                    $this->pushError($stats, 'site', $media->id, $media->path, $e->getMessage());
                }
            });

        FamilyMedia::query()
            ->whereNotNull('storage_path')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->each(function (FamilyMedia $media) use ($dryRun, $remote, $remoteDiskName, $remoteReady, &$stats): void {
                $paths = array_filter([$media->storage_path, $media->thumbnail_path]);

                if ($this->isRemoteDisk($media->disk)) {
                    $this->purgePaths('family', $media->id, $paths, $dryRun, $stats);

                    return;
                }

                if (! $remoteReady || ! $remote instanceof Filesystem || ! $media->storage_path) {
                    $stats['skipped']++;

                    return;
                }

                if (! $remote->exists($media->storage_path)) {
                    $stats['skipped']++;

                    return;
                }

                if (! FamilyMediaStorage::localPublicCopyExists($media->storage_path)) {
                    $stats['skipped']++;

                    return;
                }

                $local = Storage::disk($media->disk);
                if (! $local->exists($media->storage_path)) {
                    $stats['skipped']++;

                    return;
                }

                $remoteSize = $this->safeSize($remote, $media->storage_path);
                $localSize = $this->safeSize($local, $media->storage_path);
                if ($remoteSize === null || $localSize === null || $remoteSize !== $localSize) {
                    $stats['skipped']++;

                    return;
                }

                if ($dryRun) {
                    $stats['reconciled']++;

                    return;
                }

                try {
                    FamilyMediaStorage::purgeLocalPaths($media->storage_path, $media->thumbnail_path);
                    $media->update(['disk' => $remoteDiskName ?? 'family_media_ftp']);
                    $stats['reconciled']++;
                } catch (\Throwable $e) {
                    $stats['failed']++;
                    $this->pushError($stats, 'family', $media->id, $media->storage_path, $e->getMessage());
                }
            });

        return $stats;
    }

    /** @param  list<string|null>  $paths */
    private function purgePaths(string $scope, int $id, array $paths, bool $dryRun, array &$stats): void
    {
        foreach ($paths as $path) {
            if (! FamilyMediaStorage::localPublicCopyExists($path)) {
                $stats['skipped']++;

                continue;
            }

            if ($dryRun) {
                $stats['purged']++;

                continue;
            }

            try {
                FamilyMediaStorage::purgeLocalPublicCopy($path);
                if (FamilyMediaStorage::localPublicCopyExists($path)) {
                    $stats['failed']++;
                    $this->pushError($stats, $scope, $id, (string) $path, 'Local copy still present after purge.');
                } else {
                    $stats['purged']++;
                }
            } catch (\Throwable $e) {
                $stats['failed']++;
                $this->pushError($stats, $scope, $id, (string) $path, $e->getMessage());
            }
        }
    }

    private function isRemoteDisk(?string $disk): bool
    {
        return filled($disk) && ! in_array($disk, self::LOCAL_DISKS, true);
    }

    private function safeSize(Filesystem $disk, string $path): ?int
    {
        try {
            return $disk->size($path);
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param  array{errors: list<array{scope: string, id: int, path: string, message: string}>}  $stats */
    private function pushError(array &$stats, string $scope, int $id, string $path, string $message): void
    {
        if (count($stats['errors']) >= 10) {
            return;
        }

        $stats['errors'][] = compact('scope', 'id', 'path', 'message');
    }
}
