<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ReferenceChannel;
use Illuminate\Support\Str;

class ReferenceChannelProductService
{
    /**
     * Create or update the linked purchasable product for a reference channel.
     */
    public function syncProduct(ReferenceChannel $channel): void
    {
        $price = (int) ($channel->price ?? 0);

        if ($price <= 0) {
            if ($channel->product_id) {
                Product::query()->whereKey($channel->product_id)->update(['is_active' => false]);
            }

            return;
        }

        $slug = 'reference-'.$channel->slug;
        $isPublished = $channel->isPublished();

        $attributes = [
            'title' => $channel->title,
            'type' => Product::TYPE_REFERENCE_CHANNEL,
            'short_description' => Str::limit(strip_tags((string) ($channel->description ?? '')), 240) ?: null,
            'price' => $price,
            'sale_price' => null,
            'is_active' => $isPublished,
            'show_on_courses' => false,
            'featured_listing' => false,
            'show_in_telegram' => true,
            'telegram_list_visibility' => 'public',
            'landing_href' => '/reference-channels/'.$channel->slug,
            'featured_image' => $channel->cover_image,
        ];

        if ($channel->product_id) {
            Product::query()->whereKey($channel->product_id)->update($attributes);

            return;
        }

        $product = Product::query()->create(array_merge($attributes, [
            'slug' => $this->uniqueProductSlug($slug),
        ]));

        $channel->forceFill(['product_id' => $product->id])->saveQuietly();
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
