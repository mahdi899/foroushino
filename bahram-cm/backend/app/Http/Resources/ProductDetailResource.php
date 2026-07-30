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
        $altResolver = app(MediaAltResolver::class);
        $enricher = app(HtmlImageEnricher::class);
        $seminar = $this->seminar;
        /** @var array{amount:int,final_amount:int,seminar_discount:int,seminar_off:bool}|null $referenceQuote */
        $referenceQuote = $request->attributes->get('reference_quote');
        $effectivePrice = is_array($referenceQuote)
            ? (int) $referenceQuote['final_amount']
            : (int) $this->effective_price;

        $featured = $this->resolveMedia($this->featured_image, $altResolver);
        $featuredMobile = $this->resolveFeaturedMobile($altResolver);
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
            'description' => $enricher->enrich((string) $this->description),
            'short_description' => $this->short_description,
            'price' => $this->price,
            'sale_price' => $this->sale_price,
            'effective_price' => $effectivePrice,
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
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'already_purchased' => (bool) $request->attributes->get('already_purchased', false),
            'reference_pricing' => is_array($referenceQuote) ? [
                'amount' => (int) $referenceQuote['amount'],
                'final_amount' => (int) $referenceQuote['final_amount'],
                'seminar_discount' => (int) $referenceQuote['seminar_discount'],
                'seminar_off' => (bool) $referenceQuote['seminar_off'],
                'seminar_title' => $referenceQuote['seminar_title'] ?? null,
            ] : null,
            'seminar' => $seminar ? [
                'capacity' => $seminar->capacity,
                'attendees_count' => $seminar->registeredCount(),
                'remaining_seats' => $seminar->remainingSeats(),
                'is_full' => $seminar->isEnded() || $seminar->isFull(),
                'is_ended' => $seminar->isEnded(),
                'date' => $seminar->date?->toIso8601String(),
                'location' => $seminar->location,
            ] : null,
        ];
    }

    /**
     * @return array{url: ?string, alt: ?string}
     */
    private function resolveFeaturedMobile(MediaAltResolver $altResolver): array
    {
        if ($this->resource->isReferenceChannelProduct()) {
            $this->loadMissing('referenceChannel');
            $raw = $this->referenceChannel?->cover_image_mobile
                ?: $this->featured_image_mobile
                ?: $this->referenceChannel?->cover_image
                ?: $this->featured_image;

            return $this->resolveMedia($raw, $altResolver);
        }

        return $this->resolveMedia(
            $this->featured_image_mobile ?: $this->featured_image,
            $altResolver,
        );
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
