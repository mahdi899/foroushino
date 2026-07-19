<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Seminar;
use App\Support\MediaUrl;
use App\Support\RuntimeCache;
use Illuminate\Http\JsonResponse;

class SeminarPromoController extends Controller
{
    public function active(): JsonResponse
    {
        $data = RuntimeCache::remember('public_seminars:promo', 60, function () {
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
                return null;
            }

            $isFull = $seminar->isFull();
            $bannerPath = $isFull ? $seminar->banner_full : $seminar->banner_available;
            $bannerMobilePath = $isFull ? $seminar->banner_full_mobile : $seminar->banner_available_mobile;
            $bannerRef = filled($bannerPath) ? MediaUrl::fromDiskPath($bannerPath) : null;

            if (! $bannerRef) {
                return null;
            }

            $bannerMobileRef = filled($bannerMobilePath)
                ? MediaUrl::fromDiskPath($bannerMobilePath)
                : $bannerRef;

            $desktopDims = self::imageDimensions($bannerPath);
            $mobileDims = self::imageDimensions($bannerMobilePath) ?? $desktopDims;

            return [
                'seminar_id' => $seminar->id,
                'title' => $seminar->title,
                'banner_url' => MediaUrl::resolve($bannerRef),
                'banner_url_mobile' => MediaUrl::resolve($bannerMobileRef),
                'banner_width' => $desktopDims['width'] ?? null,
                'banner_height' => $desktopDims['height'] ?? null,
                'banner_mobile_width' => $mobileDims['width'] ?? null,
                'banner_mobile_height' => $mobileDims['height'] ?? null,
                'banner_alt' => $seminar->title,
                'link' => '/seminars/'.$seminar->slug,
                'variant' => $isFull ? 'full' : 'available',
                'is_full' => $isFull,
                'remaining_seats' => $seminar->remainingSeats(),
                'capacity' => $seminar->capacity,
                'attendees_count' => $seminar->registeredCount(),
            ];
        }, 'services');

        return response()->json(['data' => $data]);
    }

    /**
     * @return array{width: int, height: int}|null
     */
    private static function imageDimensions(?string $storagePath): ?array
    {
        if (! filled($storagePath)) {
            return null;
        }

        $ref = MediaUrl::fromDiskPath($storagePath);
        if (! is_string($ref) || ! str_starts_with($ref, '/storage/')) {
            return null;
        }

        $fullPath = storage_path('app/public/'.ltrim(substr($ref, strlen('/storage/')), '/'));
        if (! is_file($fullPath)) {
            return null;
        }

        $size = @getimagesize($fullPath);
        if ($size === false) {
            return null;
        }

        return ['width' => (int) $size[0], 'height' => (int) $size[1]];
    }
}
