<?php

namespace App\Observers;

use App\Models\DiscountCode;
use App\Services\TelegramHostCatalogRevision;

/** Push discount catalog to the foreign Telegram host when codes change. */
class DiscountCodeHostSyncObserver
{
    public function saved(DiscountCode $code): void
    {
        if (! $code->wasRecentlyCreated && ! $code->wasChanged()) {
            return;
        }

        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }

    public function deleted(DiscountCode $code): void
    {
        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }
}
