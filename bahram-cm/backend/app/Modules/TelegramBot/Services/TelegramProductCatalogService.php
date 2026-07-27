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
                    ->orWhereNotIn('type', [
                        Product::TYPE_EVENT,
                        ProductType::Event->value,
                        Product::TYPE_REFERENCE_CHANNEL,
                        ProductType::ReferenceChannel->value,
                    ]);
            })
            ->whereDoesntHave('seminar')
            ->whereDoesntHave('referenceChannel')
            ->get();
    }

    /** @return Collection<int, Product> */
    public function listPublicReferenceChannels(): Collection
    {
        return Product::query()
            ->where('is_active', true)
            ->where('show_in_telegram', true)
            ->where('telegram_list_visibility', 'public')
            ->where(function ($query): void {
                $query->where('type', Product::TYPE_REFERENCE_CHANNEL)
                    ->orWhereHas('referenceChannel', fn ($q) => $q->where('status', 'published'));
            })
            ->orderBy('telegram_sort_order')
            ->orderByDesc('id')
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
            ->where(function ($q) use ($idOrSlug): void {
                if (is_numeric($idOrSlug)) {
                    $q->where('id', (int) $idOrSlug);
                } else {
                    $q->where('slug', (string) $idOrSlug);
                }
            })
            ->where(function ($q): void {
                $q->where('show_in_telegram', true)
                    ->orWhereHas('seminar', function ($seminar): void {
                        $seminar->where('status', 'published');
                    })
                    ->orWhereHas('referenceChannel', function ($channel): void {
                        $channel->where('status', 'published');
                    });
            })
            ->with(['seminar', 'referenceChannel'])
            ->first();
    }
}
