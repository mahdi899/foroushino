<?php

namespace App\Http\Resources;

use App\Services\MediaAltResolver;
use App\Support\HtmlImageEnricher;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Article
 */
class ArticleDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $imageRef = $this->featured_image
            ? MediaUrl::fromDiskPath($this->featured_image)
            : null;
        $image = $imageRef ? MediaUrl::resolve($imageRef) : null;
        $altResolver = app(MediaAltResolver::class);
        $enricher = app(HtmlImageEnricher::class);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'content' => $enricher->enrich((string) $this->content),
            'featured_image' => $image,
            'featured_image_alt' => $imageRef
                ? $altResolver->resolve($imageRef, $this->title)
                : null,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'canonical_url' => $this->canonical_url,
            'is_indexable' => (bool) $this->is_indexable,
            'published_at' => optional($this->published_at)->toIso8601String(),
            'author' => $this->author?->name,
            'kicker' => $this->kicker,
            'reading_time' => $this->reading_time,
        ];
    }
}
