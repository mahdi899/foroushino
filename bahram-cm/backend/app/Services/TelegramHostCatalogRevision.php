<?php

namespace App\Services;

use App\Jobs\PushTelegramHostSyncJob;
use Illuminate\Support\Str;

/**
 * Monotonic revision exposed to the external Telegram host app so it can pull
 * fresh bootstrap/catalog when Iran-side content changes (push to host often
 * fails from Iranian datacenters).
 */
class TelegramHostCatalogRevision
{
    public const GROUP = 'telegram';

    public const KEY = 'host_catalog_revision';

    public function __construct(private readonly SettingService $settings) {}

    public function current(): string
    {
        $stored = $this->settings->group(self::GROUP)[self::KEY] ?? null;
        $revision = is_string($stored) ? trim($stored) : '';

        if ($revision !== '') {
            return $revision;
        }

        return $this->bump(push: false);
    }

    public function bump(bool $push = true): string
    {
        $revision = now()->format('YmdHis').'-'.Str::lower(Str::random(8));
        $group = $this->settings->group(self::GROUP);
        $group[self::KEY] = $revision;
        $this->settings->updateGroup(self::GROUP, $group);

        if ($push) {
            PushTelegramHostSyncJob::all();
        }

        return $revision;
    }
}
