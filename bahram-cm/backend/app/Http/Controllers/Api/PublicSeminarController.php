<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Seminar;
use App\Services\PurchaseGuardService;
use App\Support\MediaUrl;
use App\Support\OptionalStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicSeminarController extends Controller
{
    public function __construct(
        private readonly PurchaseGuardService $purchaseGuard,
    ) {}

    public function show(string $slug, Request $request): JsonResponse
    {
        $seminar = Seminar::query()
            ->with('product')
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if (! $seminar) {
            return response()->json([
                'error' => [
                    'code' => 'seminar_not_found',
                    'message_fa' => 'سمینار مورد نظر یافت نشد.',
                ],
            ], 404);
        }

        $coverRef = filled($seminar->cover_image) ? MediaUrl::fromDiskPath($seminar->cover_image) : null;
        $price = (int) ($seminar->price ?? 0);
        $salePrice = $seminar->sale_price !== null ? (int) $seminar->sale_price : null;
        $effectivePrice = $salePrice !== null && $salePrice > 0 && $salePrice < $price ? $salePrice : $price;
        $student = OptionalStudent::from($request);
        $product = $seminar->product;
        $alreadyPurchased = $student && $product
            ? $this->purchaseGuard->ownsProduct($student, (string) $student->mobile, $product)
            : false;

        return response()->json(['data' => [
            'id' => $seminar->id,
            'title' => $seminar->title,
            'slug' => $seminar->slug,
            'description' => $seminar->description,
            'cover_image' => $coverRef ? MediaUrl::resolve($coverRef) : null,
            'date' => $seminar->date?->toIso8601String(),
            'location' => $seminar->location,
            'price' => $price > 0 ? $price : null,
            'sale_price' => $salePrice,
            'effective_price' => $price > 0 ? $effectivePrice : null,
            'capacity' => $seminar->capacity,
            'attendees_count' => $seminar->registeredCount(),
            'remaining_seats' => $seminar->remainingSeats(),
            'is_full' => $seminar->isFull(),
            'product_slug' => $seminar->purchaseSlug(),
            'is_purchasable' => $price > 0 && $seminar->product_id && $seminar->product?->is_active,
            'already_purchased' => $alreadyPurchased,
        ]]);
    }
}
