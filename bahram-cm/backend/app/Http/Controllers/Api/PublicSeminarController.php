<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Seminar;
use App\Services\PurchaseGuardService;
use App\Support\MediaUrl;
use App\Support\OptionalStudent;
use App\Support\RuntimeCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicSeminarController extends Controller
{
    public function __construct(
        private readonly PurchaseGuardService $purchaseGuard,
    ) {}

    public function show(string $slug, Request $request): JsonResponse
    {
        // Everything below is identical for every visitor of this seminar,
        // so it is safe to cache — the one per-student field
        // (`already_purchased`) is resolved fresh below, outside the cache,
        // and merged back in afterwards.
        $cached = RuntimeCache::remember(
            'public_seminars:show:'.$slug,
            60,
            function () use ($slug) {
                $seminar = Seminar::query()
                    ->with('product')
                    ->where('slug', $slug)
                    ->where('status', 'published')
                    ->first();

                if (! $seminar) {
                    return null;
                }

                $coverRef = filled($seminar->cover_image) ? MediaUrl::fromDiskPath($seminar->cover_image) : null;
                $coverMobileRef = filled($seminar->cover_image_mobile)
                    ? MediaUrl::fromDiskPath($seminar->cover_image_mobile)
                    : null;
                $price = (int) ($seminar->price ?? 0);
                $salePrice = $seminar->sale_price !== null ? (int) $seminar->sale_price : null;
                $effectivePrice = $salePrice !== null && $salePrice > 0 && $salePrice < $price ? $salePrice : $price;

                return [
                    'id' => $seminar->id,
                    'title' => $seminar->title,
                    'slug' => $seminar->slug,
                    'description' => $seminar->description,
                    'cover_image' => $coverRef ? MediaUrl::resolve($coverRef) : null,
                    'cover_image_mobile' => $coverMobileRef ? MediaUrl::resolve($coverMobileRef) : null,
                    'date' => $seminar->date?->toIso8601String(),
                    'location' => $seminar->location,
                    'price' => $price > 0 ? $price : null,
                    'sale_price' => $salePrice,
                    'effective_price' => $price > 0 ? $effectivePrice : null,
                    'capacity' => $seminar->capacity,
                    'attendees_count' => $seminar->registeredCount(),
                    'remaining_seats' => $seminar->remainingSeats(),
                    'is_full' => $seminar->isFull(),
                    'product_id' => $seminar->product_id,
                    'product_slug' => $seminar->purchaseSlug(),
                    'product_is_active' => (bool) $seminar->product?->is_active,
                    'is_purchasable' => $price > 0 && $seminar->product_id && $seminar->product?->is_active,
                ];
            },
            'services',
        );

        if ($cached === null) {
            return response()->json([
                'error' => [
                    'code' => 'seminar_not_found',
                    'message_fa' => 'سمینار مورد نظر یافت نشد.',
                ],
            ], 404);
        }

        $student = OptionalStudent::from($request);
        $alreadyPurchased = false;

        if ($student && $cached['product_id']) {
            $product = Product::query()->find($cached['product_id']);
            $alreadyPurchased = $product
                ? $this->purchaseGuard->ownsProduct($student, (string) $student->mobile, $product)
                : false;
        }

        unset($cached['product_id'], $cached['product_is_active']);

        return response()->json(['data' => [
            ...$cached,
            'already_purchased' => $alreadyPurchased,
        ]]);
    }
}
