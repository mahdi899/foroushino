<?php

namespace App\Http\Resources\V1\Family;

use App\Support\FamilyMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FamilyPostBlock */
class FamilyPostBlockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $media = $this->whenLoaded('media') ? $this->media : null;
        $article = $this->whenLoaded('article') ? $this->article : null;

        return [
            'id' => $this->id,
            'type' => $this->type?->value ?? $this->type,
            'position' => (int) $this->position,
            'text' => $this->text_content,
            'data' => $this->data,
            'media' => $media ? [
                'id' => $media->id,
                'type' => $media->type?->value ?? $media->type,
                'url' => FamilyMediaUrl::fromPath($media->storage_path),
                'poster_url' => FamilyMediaUrl::fromPath($media->thumbnail_path),
                'duration' => $media->duration,
                'width' => $media->width,
                'height' => $media->height,
                'waveform' => $media->waveform,
                'mime_type' => $media->mime_type,
                'status' => $media->status?->value ?? $media->status,
            ] : null,
            'article' => $article ? [
                'id' => $article->id,
                'title' => $article->title,
                'slug' => $article->slug,
                'excerpt' => $article->excerpt,
                'thumbnail' => $article->featured_image,
                'url' => '/insights/'.$article->slug,
            ] : null,
        ];
    }
}
