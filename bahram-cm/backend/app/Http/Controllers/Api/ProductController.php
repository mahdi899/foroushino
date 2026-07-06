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
        $products = Product::query()
            ->active()
            ->orderByDesc('created_at')
            ->get();

        return ProductListResource::collection($products);
    }

    public function show(string $slug)
    {
        $product = Product::query()
            ->active()
            ->where('slug', $slug)
            ->first();

        if (! $product) {
            return ApiResponse::error('product_not_found', 'محصول مورد نظر یافت نشد.', 404);
        }

        return ProductDetailResource::make($product);
    }
}
