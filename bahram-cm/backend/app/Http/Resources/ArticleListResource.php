<?php

namespace App\Http\Resources;

use App\Services\MediaAltResolver;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Article
 */
class ArticleListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $imageRef = $this->featured_image
            ? MediaUrl::fromDiskPath($this->featured_image)
            : null;
        $image = $imageRef ? MediaUrl::resolve($imageRef) : null;
        $altResolver = app(MediaAltResolver::class);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'featured_image' => $image,
            'featured_image_alt' => $imageRef
                ? $altResolver->resolve($imageRef, $this->title)
                : null,
            'published_at' => optional($this->published_at)->toIso8601String(),
        ];
    }
}
