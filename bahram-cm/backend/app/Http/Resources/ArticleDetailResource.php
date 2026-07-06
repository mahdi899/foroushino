<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Article
 */
class ArticleDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'content' => $this->content,
            'featured_image' => $this->featured_image ? asset('storage/'.$this->featured_image) : null,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'canonical_url' => $this->canonical_url,
            'is_indexable' => (bool) $this->is_indexable,
            'published_at' => optional($this->published_at)->toIso8601String(),
            'author' => $this->author?->name,
        ];
    }
}
