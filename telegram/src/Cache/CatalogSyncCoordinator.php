<?php

declare(strict_types=1);

namespace TelegramHost\Cache;

use TelegramHost\Http\SyncClient;

/**
 * Pulls fresh catalog/bootstrap from Iran when catalog_revision changes.
 * Called from cron/pull-sync.php only — webhook must not use this.
 */
final class CatalogSyncCoordinator
{
    private const REVISION_CHECK_INTERVAL_SECONDS = 45;

    public function __construct(
        private readonly SyncCache $cache,
        private readonly SyncClient $sync,
    ) {}

    public function ensureFresh(): void
    {
        if ($this->cache->secondsSinceRevisionCheck() < self::REVISION_CHECK_INTERVAL_SECONDS) {
            return;
        }

        $this->cache->markRevisionChecked();

        try {
            $meta = $this->sync->call('sync-meta', []);
            $remoteRevision = trim((string) ($meta['catalog_revision'] ?? ''));
            if ($remoteRevision === '' || $remoteRevision === $this->cache->catalogRevision()) {
                return;
            }

            $this->cache->refreshAll();
        } catch (\Throwable $e) {
            error_log('[telegram-host] catalog sync: '.$e->getMessage());
        }
    }
}
