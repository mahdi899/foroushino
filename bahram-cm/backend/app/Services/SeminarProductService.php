<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Seminar;
use Illuminate\Support\Str;

class SeminarProductService
{
    /**
     * Create or update the linked purchasable product for a seminar.
     */
    public function syncProduct(Seminar $seminar): void
    {
        $price = (int) ($seminar->price ?? 0);

        if ($price <= 0) {
            if ($seminar->product_id) {
                Product::query()->whereKey($seminar->product_id)->update(['is_active' => false]);
            }

            return;
        }

        $slug = 'seminar-'.$seminar->slug;
        $isPublished = ($seminar->status ?? 'draft') === 'published';

        $attributes = [
            'title' => $seminar->title,
            'type' => Product::TYPE_EVENT,
            'short_description' => Str::limit((string) ($seminar->description ?? ''), 240) ?: null,
            'price' => $price,
            'sale_price' => $seminar->sale_price,
            'is_active' => $isPublished,
            'show_on_courses' => false,
            'featured_listing' => false,
            'landing_href' => '/seminars/'.$seminar->slug,
            'featured_image' => $seminar->cover_image,
        ];

        if ($seminar->product_id) {
            Product::query()->whereKey($seminar->product_id)->update($attributes);

            return;
        }

        $product = Product::query()->create(array_merge($attributes, [
            'slug' => $this->uniqueProductSlug($slug),
        ]));

        $seminar->forceFill(['product_id' => $product->id])->saveQuietly();
    }

    private function uniqueProductSlug(string $base): string
    {
        $slug = $base;
        $suffix = 2;

        while (Product::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
