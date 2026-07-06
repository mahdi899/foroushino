<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\AppNotification
 */
class AppNotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind?->value,
            'title' => $this->title,
            'body' => $this->body,
            'href' => $this->href,
            'read' => $this->read,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
