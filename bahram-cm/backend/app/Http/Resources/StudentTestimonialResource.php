<?php

namespace App\Http\Resources;

use App\Support\HtmlImageEnricher;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\StudentTestimonial
 */
class StudentTestimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enricher = app(HtmlImageEnricher::class);
        $portrait = $this->portrait_image
            ? (MediaUrl::resolve($this->portrait_image) ?? $this->portrait_image)
            : null;

        return [
            'slug' => $this->slug,
            'name' => $this->name,
            'role' => $this->role,
            'before' => $this->before_text,
            'after' => $this->after_text,
            'summary' => $this->summary,
            'metaTitle' => $this->meta_title,
            'metaDescription' => $this->meta_description,
            'metricLabel' => $this->metric_label,
            'metricValue' => $this->metric_value,
            'portrait_image' => $portrait,
            'body' => $enricher->enrich((string) ($this->body ?? '')),
        ];
    }
}
