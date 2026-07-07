<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ContentPublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function __construct(private readonly ContentPublishService $publish) {}

    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->orderByDesc('id');

        if ($request->has('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $products = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $products->getCollection()->map(fn (Product $p) => $this->payload($p)),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => $this->payload($product)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateProduct($request);
        if (blank($data['slug'] ?? null)) {
            $data['slug'] = Str::slug($data['title']);
        }

        $product = Product::create($data);
        $this->publish->revalidateProducts($product->slug);

        return response()->json(['data' => $this->payload($product)], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validateProduct($request, $product);
        $product->update($data);
        $this->publish->revalidateProducts($product->slug);

        return response()->json(['data' => $this->payload($product->fresh())]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $slug = $product->slug;
        $product->delete();
        $this->publish->revalidateProducts($slug);

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(Product $product): array
    {
        return [
            'id' => $product->id,
            'title' => $product->title,
            'slug' => $product->slug,
            'type' => $product->type,
            'description' => $product->description,
            'short_description' => $product->short_description,
            'price' => $product->price,
            'sale_price' => $product->sale_price,
            'effective_price' => $product->effective_price,
            'is_active' => $product->is_active,
            'featured_image' => $product->featured_image,
            'featured_image_url' => $product->featured_image ? '/storage/'.$product->featured_image : null,
            'spotplayer_course_id' => $product->spotplayer_course_id,
            'spotplayer_product_id' => $product->spotplayer_product_id,
            'meta_title' => $product->meta_title,
            'meta_description' => $product->meta_description,
            'created_at' => $product->created_at?->toIso8601String(),
            'updated_at' => $product->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function validateProduct(Request $request, ?Product $product = null): array
    {
        return $request->validate([
            'title' => [$product ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => [
                $product ? 'sometimes' : 'nullable',
                'string',
                'max:255',
                Rule::unique('products', 'slug')->ignore($product?->id),
            ],
            'type' => ['sometimes', 'string', Rule::in(['package', 'normal'])],
            'description' => ['sometimes', 'nullable', 'string'],
            'short_description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'price' => [$product ? 'sometimes' : 'required', 'integer', 'min:0'],
            'sale_price' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'featured_image' => ['sometimes', 'nullable', 'string', 'max:500'],
            'spotplayer_course_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'spotplayer_product_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }
}
