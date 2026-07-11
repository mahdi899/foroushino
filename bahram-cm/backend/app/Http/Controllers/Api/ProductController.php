<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use App\Services\MediaAltResolver;
use App\Services\PurchaseGuardService;
use App\Support\ApiResponse;
use App\Support\MediaUrl;
use App\Support\OptionalStudent;
use App\Support\RuntimeCache;
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

    public function show(string $slug, Request $request)
    {
        $cacheKey = 'public_products:show:'.$slug;

        $product = RuntimeCache::remember($cacheKey, 3600, function () use ($slug) {
            return Product::query()
                ->active()
                ->with('seminar')
                ->where('slug', $slug)
                ->first();
        }, 'services');

        if (! $product) {
            return ApiResponse::error('product_not_found', 'محصول مورد نظر یافت نشد.', 404);
        }

        if ($product->featured_image) {
            app(MediaAltResolver::class)->warmReferences([
                MediaUrl::fromDiskPath($product->featured_image),
            ]);
        }

        $student = OptionalStudent::from($request);
        $request->attributes->set(
            'already_purchased',
            $student
                ? $this->purchaseGuard->ownsProduct($student, (string) $student->mobile, $product)
                : false,
        );

        return ProductDetailResource::make($product);
    }
}
