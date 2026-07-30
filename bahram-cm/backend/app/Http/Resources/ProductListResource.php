<?php

namespace App\Http\Resources;

use App\Services\MediaAltResolver;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Product
 */
class ProductListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $altResolver = app(MediaAltResolver::class);
        $featured = $this->resolveMedia($this->featured_image, $altResolver);
        $featuredMobile = $this->resolveMedia(
            $this->featured_image_mobile ?: $this->featured_image,
            $altResolver,
        );
        $hero = $this->resolveMedia($this->landing_hero_image, $altResolver);
        $heroMobile = $this->resolveMedia(
            $this->landing_hero_image_mobile ?: $this->landing_hero_image,
            $altResolver,
        );

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'type' => $this->type,
            'short_description' => $this->short_description,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'effective_price' => $this->effective_price,
            'featured_image' => $featured['url'],
            'featured_image_alt' => $featured['alt'],
            'featured_image_mobile' => $featuredMobile['url'],
            'featured_image_mobile_alt' => $featuredMobile['alt'],
            'landing_hero_image' => $hero['url'],
            'landing_hero_image_alt' => $hero['alt'],
            'landing_hero_image_mobile' => $heroMobile['url'],
            'landing_hero_image_mobile_alt' => $heroMobile['alt'],
            'show_on_courses' => (bool) $this->show_on_courses,
            'featured_listing' => (bool) $this->featured_listing,
            'course_level' => $this->course_level,
            'course_duration' => $this->course_duration,
            'landing_href' => $this->landing_href,
        ];
    }

    /**
     * @return array{url: ?string, alt: ?string}
     */
    private function resolveMedia(mixed $raw, MediaAltResolver $altResolver): array
    {
        if (! filled($raw)) {
            return ['url' => null, 'alt' => null];
        }

        $ref = MediaUrl::fromDiskPath((string) $raw) ?? MediaUrl::reference((string) $raw);
        if (! $ref) {
            return ['url' => null, 'alt' => null];
        }

        return [
            'url' => MediaUrl::resolve($ref),
            'alt' => $altResolver->resolve($ref, $this->title),
        ];
    }
}
