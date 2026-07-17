<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ContentPublishService;
use App\Services\InAppNotificationService;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function __construct(
        private readonly ContentPublishService $publish,
        private readonly InAppNotificationService $notifications,
    ) {}

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
        $data = $this->normalizeProductMedia($data);

        $product = Product::create($data);
        $this->publish->revalidateProducts($product->slug);
        $this->notifications->newProduct($product, $request->user()?->id);

        return response()->json(['data' => $this->payload($product)], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $wasInactive = ! $product->is_active;
        $data = $this->validateProduct($request, $product);
        $data = $this->normalizeProductMedia($data);
        $product->update($data);
        $fresh = $product->fresh();
        $this->publish->revalidateProducts($fresh->slug);

        if ($wasInactive && $fresh->is_active) {
            $this->notifications->newProduct($fresh, $request->user()?->id);
        }

        return response()->json(['data' => $this->payload($fresh)]);
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
        $imageRef = $product->featured_image
            ? MediaUrl::fromDiskPath($product->featured_image)
            : null;

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
            'referral_cashback_enabled' => (bool) $product->referral_cashback_enabled,
            'referral_cashback_type' => $product->referral_cashback_type,
            'referral_cashback_value' => $product->referral_cashback_value,
            'is_active' => $product->is_active,
            'show_in_telegram' => (bool) $product->show_in_telegram,
            'telegram_list_visibility' => $product->telegram_list_visibility ?? 'public',
            'telegram_sort_order' => (int) ($product->telegram_sort_order ?? 0),
            'show_on_courses' => (bool) $product->show_on_courses,
            'featured_listing' => (bool) $product->featured_listing,
            'course_level' => $product->course_level,
            'course_duration' => $product->course_duration,
            'landing_href' => $product->landing_href,
            'featured_image' => $imageRef,
            'featured_image_url' => $imageRef,
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
            'referral_cashback_enabled' => ['sometimes', 'boolean'],
            'referral_cashback_type' => ['sometimes', 'nullable', 'string', Rule::in(['percent', 'fixed']), 'required_if:referral_cashback_enabled,true'],
            'referral_cashback_value' => ['sometimes', 'nullable', 'integer', 'min:1', 'required_if:referral_cashback_enabled,true'],
            'is_active' => ['sometimes', 'boolean'],
            'show_in_telegram' => ['sometimes', 'boolean'],
            'telegram_list_visibility' => ['sometimes', 'string', Rule::in(['public', 'private'])],
            'telegram_sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'show_on_courses' => ['sometimes', 'boolean'],
            'featured_listing' => ['sometimes', 'boolean'],
            'course_level' => ['sometimes', 'nullable', 'string', 'max:120'],
            'course_duration' => ['sometimes', 'nullable', 'string', 'max:120'],
            'landing_href' => ['sometimes', 'nullable', 'string', 'max:255'],
            'featured_image' => ['sometimes', 'nullable', 'string', 'max:500'],
            'spotplayer_course_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'spotplayer_product_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    /** @param  array<string, mixed>  $data */
    private function normalizeProductMedia(array $data): array
    {
        if (! array_key_exists('featured_image', $data)) {
            return $data;
        }

        $data['featured_image'] = $this->normalizeFeaturedImagePath($data['featured_image']);

        return $data;
    }

    private function normalizeFeaturedImagePath(mixed $url): ?string
    {
        if (! filled($url)) {
            return null;
        }

        $ref = MediaUrl::reference((string) $url);

        return $ref ?: null;
    }
}
