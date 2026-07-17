<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\ProductType;
use App\Models\Product;
use Illuminate\Support\Collection;

class TelegramProductCatalogService
{
    /** @return Collection<int, Product> */
    public function listPublic(): Collection
    {
        return $this->publicTelegramQuery()->get();
    }

    /** @return Collection<int, Product> */
    public function listPublicCourses(): Collection
    {
        return $this->publicTelegramQuery()
            ->where(function ($query): void {
                $query->whereNull('type')
                    ->orWhereNotIn('type', [Product::TYPE_EVENT, ProductType::Event->value]);
            })
            ->whereDoesntHave('seminar')
            ->get();
    }

    /** @return \Illuminate\Database\Eloquent\Builder<Product> */
    private function publicTelegramQuery()
    {
        return Product::query()
            ->where('is_active', true)
            ->where('show_in_telegram', true)
            ->where('telegram_list_visibility', 'public')
            ->orderBy('telegram_sort_order')
            ->orderByDesc('id');
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
