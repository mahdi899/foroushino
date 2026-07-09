<?php

namespace App\Http\Resources;

use App\Services\MediaAltResolver;
use App\Support\HtmlImageEnricher;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
class ProductDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $imageRef = $this->featured_image
            ? MediaUrl::fromDiskPath($this->featured_image)
            : null;
        $altResolver = app(MediaAltResolver::class);
        $enricher = app(HtmlImageEnricher::class);
        $seminar = $this->seminar;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'type' => $this->type,
            'description' => $enricher->enrich((string) $this->description),
            'short_description' => $this->short_description,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'effective_price' => $this->effective_price,
            'featured_image' => $imageRef ? MediaUrl::resolve($imageRef) : null,
            'featured_image_alt' => $imageRef
                ? $altResolver->resolve($imageRef, $this->title)
                : null,
            'show_on_courses' => (bool) $this->show_on_courses,
            'featured_listing' => (bool) $this->featured_listing,
            'course_level' => $this->course_level,
            'course_duration' => $this->course_duration,
            'landing_href' => $this->landing_href,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'seminar' => $seminar ? [
                'capacity' => $seminar->capacity,
                'attendees_count' => $seminar->registeredCount(),
                'remaining_seats' => $seminar->remainingSeats(),
                'is_full' => $seminar->isFull(),
                'date' => $seminar->date?->toIso8601String(),
                'location' => $seminar->location,
            ] : null,
        ];
    }
}
