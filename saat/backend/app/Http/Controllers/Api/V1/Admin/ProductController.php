<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreProductRequest;
use App\Http\Requests\V1\Admin\UpdateProductRequest;
use App\Http\Resources\V1\ProductResource;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $products = Product::query()->withCount('leads')->orderBy('name')->get();

        return ApiResponse::success(ProductResource::collection($products));
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = Product::query()->create($request->validated());

        return ApiResponse::success(new ProductResource($product), 'محصول ایجاد شد', 201);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product->update($request->validated());

        return ApiResponse::success(new ProductResource($product), 'محصول به‌روزرسانی شد');
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorizeAdmin($request);

        $product->update(['is_active' => false]);

        return ApiResponse::success(null, 'محصول غیرفعال شد');
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('admin.products'), 403, 'اجازه دسترسی ندارید.');
    }
}
