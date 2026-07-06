<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'category' => $this->category,
            'price' => (string) $this->price,
            'commission_rate' => (string) $this->commission_rate,
            'description' => $this->description,
            'is_active' => $this->is_active,
        ];
    }
}
