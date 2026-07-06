<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Objection
 */
class ObjectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'key' => $this->key?->value,
            'title' => $this->title,
            'suggested_response' => $this->suggested_response,
            'category' => $this->category,
        ];
    }
}
