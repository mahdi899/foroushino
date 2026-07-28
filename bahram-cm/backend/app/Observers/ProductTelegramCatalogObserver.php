<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\TelegramHostCatalogRevision;

/** Bumps Telegram host catalog revision when storefront/telegram product data changes. */
class ProductTelegramCatalogObserver
{
    public function saved(Product $product): void
    {
        if (! $this->affectsTelegramCatalog($product)) {
            return;
        }

        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }

    public function deleted(Product $product): void
    {
        app(TelegramHostCatalogRevision::class)->bump(scope: 'catalog');
    }

    private function affectsTelegramCatalog(Product $product): bool
    {
        return $product->wasRecentlyCreated || $product->wasChanged([
            'is_active',
            'show_in_telegram',
            'title',
            'price',
            'sale_price',
            'slug',
            'type',
            'telegram_sort_order',
            'telegram_list_visibility',
        ]);
    }
}
