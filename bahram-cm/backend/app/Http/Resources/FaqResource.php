<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Faq
 */
class FaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question' => $this->question,
            'answer' => $this->answer,
            'category' => $this->category,
            'sort_order' => $this->sort_order,
        ];
    }
}
