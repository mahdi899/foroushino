<?php

namespace App\Observers;

use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Services\TelegramHostCatalogRevision;

/** Push destinations (in catalog payload) to the foreign Telegram host. */
class TelegramDestinationHostSyncObserver
{
    public function saved(TelegramDestination $destination): void
    {
        if (! $destination->wasRecentlyCreated && ! $destination->wasChanged()) {
            return;
        }

        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }

    public function deleted(TelegramDestination $destination): void
    {
        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }
}
