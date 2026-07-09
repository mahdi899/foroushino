<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Seminar;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;

class SeminarPromoController extends Controller
{
    public function active(): JsonResponse
    {
        $seminar = Seminar::query()
            ->with('product')
            ->where('promo_enabled', true)
            ->where('status', 'published')
            ->whereNotNull('product_id')
            ->where('date', '>=', now())
            ->whereHas('product', fn ($q) => $q->active())
            ->orderBy('date')
            ->first();

        if (! $seminar) {
            return response()->json(['data' => null]);
        }

        $isFull = $seminar->isFull();
        $bannerPath = $isFull ? $seminar->banner_full : $seminar->banner_available;
        $bannerRef = filled($bannerPath) ? MediaUrl::fromDiskPath($bannerPath) : null;

        if (! $bannerRef) {
            return response()->json(['data' => null]);
        }

        $slug = $seminar->purchaseSlug();

        return response()->json(['data' => [
            'seminar_id' => $seminar->id,
            'title' => $seminar->title,
            'banner_url' => MediaUrl::resolve($bannerRef),
            'banner_alt' => $seminar->title,
            'link' => '/seminars/'.$seminar->slug,
            'variant' => $isFull ? 'full' : 'available',
            'is_full' => $isFull,
            'remaining_seats' => $seminar->remainingSeats(),
            'capacity' => $seminar->capacity,
            'attendees_count' => $seminar->registeredCount(),
        ]]);
    }
}
