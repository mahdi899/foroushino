<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\StudentTestimonial
 */
class StudentTestimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
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
            'portrait_image' => $this->portrait_image,
            'body' => $this->body,
        ];
    }
}
