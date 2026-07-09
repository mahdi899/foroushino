<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductListResource;
use App\Models\Product;
use App\Support\ApiResponse;

class ProductController extends Controller
{
    public function index()
    {
        $query = Product::query()->active()->orderByDesc('created_at');

        if (filter_var(request()->input('listed'), FILTER_VALIDATE_BOOLEAN)) {
            $query->listedOnCourses();
        }

        $products = $query->get();

        return ProductListResource::collection($products);
    }

    public function show(string $slug)
    {
        $product = Product::query()
            ->active()
            ->with('seminar')
            ->where('slug', $slug)
            ->first();

        if (! $product) {
            return ApiResponse::error('product_not_found', 'محصول مورد نظر یافت نشد.', 404);
        }

        return ProductDetailResource::make($product);
    }
}
