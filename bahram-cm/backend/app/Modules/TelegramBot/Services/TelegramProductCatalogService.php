<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use Illuminate\Support\Collection;

class TelegramProductCatalogService
{
    /** @return Collection<int, Product> */
    public function listPublic(): Collection
    {
        return Product::query()
            ->where('is_active', true)
            ->where('show_in_telegram', true)
            ->where('telegram_list_visibility', 'public')
            ->orderBy('telegram_sort_order')
            ->orderByDesc('id')
            ->get();
    }

    public function findForTelegram(int|string $idOrSlug): ?Product
    {
        return Product::query()
            ->where('is_active', true)
            ->where('show_in_telegram', true)
            ->where(function ($q) use ($idOrSlug): void {
                if (is_numeric($idOrSlug)) {
                    $q->where('id', (int) $idOrSlug);
                } else {
                    $q->where('slug', (string) $idOrSlug);
                }
            })
            ->first();
    }
}
