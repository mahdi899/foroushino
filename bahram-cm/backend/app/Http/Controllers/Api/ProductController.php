<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use App\Services\MediaAltResolver;
use App\Services\PurchaseGuardService;
use App\Services\ReferenceChannelPricingService;
use App\Support\ApiResponse;
use App\Support\MediaUrl;
use App\Support\OptionalStudent;
use App\Support\RuntimeCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        private readonly PurchaseGuardService $purchaseGuard,
    ) {}

    public function index(Request $request)
    {
        $listed = filter_var($request->input('listed'), FILTER_VALIDATE_BOOLEAN);
        $cacheKey = 'public_products:index:'.($listed ? 'listed' : 'all');

        return RuntimeCache::remember($cacheKey, 3600, function () use ($listed) {
            $query = Product::query()->active()->orderByDesc('created_at');

            if ($listed) {
                $query->listedOnCourses();
            }

            $products = $query->get();

            $refs = $products
                ->pluck('featured_image')
                ->filter()
                ->map(fn (?string $path) => $path ? MediaUrl::fromDiskPath($path) : null)
                ->filter()
                ->values()
                ->all();

            app(MediaAltResolver::class)->warmReferences($refs);

            return ProductListResource::collection($products);
        }, 'services');
    }

    public function show(string $slug, Request $request): JsonResponse
    {
        $cacheKey = 'public_products:payload:'.$slug;

        $cached = RuntimeCache::remember($cacheKey, 3600, function () use ($slug) {
            $product = Product::query()
                ->active()
                ->with(['seminar', 'referenceChannel'])
                ->where('slug', $slug)
                ->first();

            if (! $product) {
                return null;
            }

            if ($product->featured_image) {
                app(MediaAltResolver::class)->warmReferences([
                    MediaUrl::fromDiskPath($product->featured_image),
                ]);
            }

            $guestRequest = Request::create('/api/products/'.$slug, 'GET');
            $guestRequest->attributes->set('already_purchased', false);

            if ($product->isReferenceChannelProduct()) {
                $guestRequest->attributes->set(
                    'reference_quote',
                    app(ReferenceChannelPricingService::class)->quoteForProduct($product, null),
                );
            }

            return [
                'product_id' => $product->id,
                'payload' => (new ProductDetailResource($product))->toArray($guestRequest),
            ];
        }, 'services');

        if ($cached === null) {
            return ApiResponse::error('product_not_found', 'محصول مورد نظر یافت نشد.', 404);
        }

        $payload = $cached['payload'];
        $student = OptionalStudent::from($request);
        $personalized = $student !== null;

        if ($personalized) {
            $product = Product::query()
                ->with(['seminar', 'referenceChannel'])
                ->find($cached['product_id']);

            if (! $product) {
                return ApiResponse::error('product_not_found', 'محصول مورد نظر یافت نشد.', 404);
            }

            $payload['already_purchased'] = $this->purchaseGuard->ownsProduct(
                $student,
                (string) $student->mobile,
                $product,
            );

            if ($product->isReferenceChannelProduct()) {
                $quote = app(ReferenceChannelPricingService::class)->quoteForProduct($product, $student);
                $payload['reference_pricing'] = [
                    'amount' => (int) $quote['amount'],
                    'final_amount' => (int) $quote['final_amount'],
                    'seminar_discount' => (int) $quote['seminar_discount'],
                    'seminar_off' => (bool) $quote['seminar_off'],
                ];
                $payload['effective_price'] = (int) $quote['final_amount'];
            }
        }

        $response = response()->json(['data' => $payload]);

        return $personalized
            ? $response->header('Cache-Control', 'private, no-store')
            : $response->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    }
}
