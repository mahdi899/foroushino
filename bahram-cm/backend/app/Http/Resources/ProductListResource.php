<?php

namespace App\Http\Resources;

use App\Services\MediaAltResolver;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
class ProductListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $imageRef = $this->featured_image
            ? MediaUrl::fromDiskPath($this->featured_image)
            : null;
        $altResolver = app(MediaAltResolver::class);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'type' => $this->type,
            'short_description' => $this->short_description,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'effective_price' => $this->effective_price,
            'featured_image' => $imageRef ? MediaUrl::resolve($imageRef) : null,
            'featured_image_alt' => $imageRef
                ? $altResolver->resolve($imageRef, $this->title)
                : null,
        ];
    }
}
