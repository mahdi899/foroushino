<?php

namespace App\Http\Controllers\Api\V1\Misc;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\LeadSourceResource;
use App\Http\Resources\V1\ObjectionResource;
use App\Http\Resources\V1\ProductResource;
use App\Http\Resources\V1\ScriptResource;
use App\Models\LeadSourceCatalog;
use App\Models\Objection;
use App\Models\Product;
use App\Models\Script;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function products(Request $request): JsonResponse
    {
        return ApiResponse::success(ProductResource::collection(
            Product::query()->where('is_active', true)->orderBy('name')->get()
        ));
    }

    public function showProduct(Request $request, Product $product): JsonResponse
    {
        $canViewInactive = (bool) $request->user()?->can('admin.products');

        abort_if(! $product->is_active && ! $canViewInactive, 404, 'محصول یافت نشد.');

        return ApiResponse::success(new ProductResource($product));
    }

    public function leadSources(Request $request): JsonResponse
    {
        return ApiResponse::success(LeadSourceResource::collection(
            LeadSourceCatalog::query()->forForm()->orderBy('sort_order')->orderBy('label')->get()
        ));
    }

    public function scripts(Request $request): JsonResponse
    {
        $query = Script::query();

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }
        if ($request->filled('stage')) {
            $query->where('stage', $request->string('stage'));
        }

        return ApiResponse::success(ScriptResource::collection($query->get()));
    }

    public function objections(Request $request): JsonResponse
    {
        $query = Objection::query();

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }

        return ApiResponse::success(ObjectionResource::collection($query->get()));
    }
}
