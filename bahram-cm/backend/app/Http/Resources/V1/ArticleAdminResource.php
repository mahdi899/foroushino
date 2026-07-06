<?php

namespace App\Http\Resources\V1;

use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Article */
class ArticleAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $cover = $this->featured_image
            ? (str_starts_with($this->featured_image, '/storage/')
                ? $this->featured_image
                : MediaUrl::fromDiskPath($this->featured_image))
            : null;

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'body' => $this->content,
            'cover_url' => $cover,
            'reading_time' => $this->reading_time,
            'kicker' => $this->kicker,
            'published_at' => $this->published_at?->toIso8601String(),
            'status' => $this->status === 'published' ? 'active' : 'draft',
            'category' => null,
            'tags' => [],
            'seo' => [
                'title' => $this->meta_title ?? $this->title,
                'description' => $this->meta_description ?? $this->excerpt,
                'canonical' => $this->canonical_url,
                'robots' => $this->is_indexable ? 'index,follow' : 'noindex,nofollow',
            ],
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'purge_at' => $this->deleted_at
                ? $this->deleted_at->copy()->addHours(\App\Models\Article::TRASH_RETENTION_HOURS)->toIso8601String()
                : null,
        ];
    }
}
