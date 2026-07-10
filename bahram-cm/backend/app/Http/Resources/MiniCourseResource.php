<?php

namespace App\Http\Resources;

use App\Support\HtmlImageEnricher;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\MiniCourse
 */
class MiniCourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enricher = app(HtmlImageEnricher::class);
        $thumbnail = $this->thumbnail
            ? (MediaUrl::resolve($this->thumbnail) ?? $this->thumbnail)
            : null;

        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'summary' => $this->summary,
            'description' => $enricher->enrich((string) ($this->description ?? '')),
            'thumbnail' => $thumbnail,
            'thumbnail_mobile' => $this->thumbnail_mobile
                ? (MediaUrl::resolve($this->thumbnail_mobile) ?? $this->thumbnail_mobile)
                : null,
            'aparat_hash' => $this->aparat_hash,
            'level' => $this->level,
            'duration' => $this->duration,
            'comments_enabled' => $this->comments_enabled,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
        ];
    }
}
