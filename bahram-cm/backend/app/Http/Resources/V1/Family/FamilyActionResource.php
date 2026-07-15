<?php

namespace App\Http\Resources\V1\Family;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FamilyAction */
class FamilyActionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type?->value ?? $this->type,
            'prompt' => $this->prompt,
            'config' => $this->config,
            'options' => ($this->relationLoaded('options') ? $this->options : collect())->map(fn ($o) => [
                'id' => $o->id,
                'label' => $o->label,
                'value' => $o->value,
                'position' => (int) $o->position,
            ])->values(),
            'results' => $this->when(
                $this->resource->getAttribute('result_stats') !== null,
                fn () => $this->resource->getAttribute('result_stats'),
            ),
            'responded' => (bool) $this->resource->getAttribute('responded'),
            'user_response' => $this->resource->getAttribute('user_response'),
        ];
    }
}
