<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
class ProductDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'type' => $this->type,
            'description' => $this->description,
            'short_description' => $this->short_description,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'effective_price' => $this->effective_price,
            'featured_image' => $this->featured_image ? asset('storage/'.$this->featured_image) : null,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
        ];
    }
}
