<?php

namespace App\Http\Resources\V1\Family;

use App\Support\FamilyMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FamilyStory */
class FamilyStoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $media = $this->whenLoaded('media') ? $this->media : null;

        return [
            'id' => $this->id,
            'caption' => $this->caption,
            'published_at' => $this->published_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'media' => $media ? [
                'id' => $media->id,
                'type' => $media->type?->value ?? $media->type,
                'url' => FamilyMediaUrl::fromPath($media->storage_path, $media->disk),
                'width' => $media->width,
                'height' => $media->height,
                'duration' => $media->duration,
                'mime_type' => $media->mime_type,
            ] : null,
        ];
    }
}
