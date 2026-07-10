<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\DiscountRestriction;
use App\Enums\DiscountType;
use App\Http\Controllers\Controller;
use App\Models\DiscountCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiscountCodeAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DiscountCode::query()->withCount('usages')->latest('id');

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%");
            });
        }

        $codes = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $codes->getCollection()->map(fn (DiscountCode $c) => $this->listPayload($c)),
            'meta' => [
                'current_page' => $codes->currentPage(),
                'last_page' => $codes->lastPage(),
                'per_page' => $codes->perPage(),
                'total' => $codes->total(),
            ],
        ]);
    }

    public function show(DiscountCode $discountCode): JsonResponse
    {
        $discountCode->load(['products:id,title', 'users:id,name,mobile']);

        return response()->json(['data' => $this->detailPayload($discountCode)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $discountCode = DiscountCode::create($data['attributes']);
        $this->syncRelations($discountCode, $data);

        return response()->json(['data' => $this->detailPayload($discountCode->fresh(['products', 'users']))], 201);
    }

    public function update(Request $request, DiscountCode $discountCode): JsonResponse
    {
        $data = $this->validated($request, $discountCode);
        $discountCode->update($data['attributes']);
        $this->syncRelations($discountCode, $data);

        return response()->json(['data' => $this->detailPayload($discountCode->fresh(['products', 'users']))]);
    }

    public function destroy(DiscountCode $discountCode): JsonResponse
    {
        if ($discountCode->usages()->exists()) {
            return response()->json([
                'message' => 'این کد تخفیف در سفارش‌ها استفاده شده و قابل حذف نیست.',
            ], 422);
        }

        $discountCode->delete();

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function listPayload(DiscountCode $code): array
    {
        return [
            'id' => $code->id,
            'code' => $code->normalizedCode(),
            'title' => $code->title,
            'discount_type' => $code->discount_type->value,
            'discount_value' => $code->discount_value,
            'is_active' => $code->is_active,
            'starts_at' => $code->starts_at?->toIso8601String(),
            'ends_at' => $code->ends_at?->toIso8601String(),
            'max_uses' => $code->max_uses,
            'uses_count' => $code->uses_count,
            'restriction' => $code->restriction->value,
            'requires_link' => $code->requires_link,
            'created_at' => $code->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function detailPayload(DiscountCode $code): array
    {
        return [
            ...$this->listPayload($code),
            'description' => $code->description,
            'max_uses_per_user' => $code->max_uses_per_user,
            'min_order_amount' => $code->min_order_amount,
            'max_discount_amount' => $code->max_discount_amount,
            'product_ids' => $code->products->pluck('id')->values()->all(),
            'products' => $code->products->map(fn ($p) => ['id' => $p->id, 'title' => $p->title])->values()->all(),
            'user_ids' => $code->users->pluck('id')->values()->all(),
            'users' => $code->users->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'mobile' => $u->mobile,
            ])->values()->all(),
            'updated_at' => $code->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{
     *   attributes: array<string, mixed>,
     *   product_ids: array<int>,
     *   user_ids: array<int>
     * }
     */
    private function validated(Request $request, ?DiscountCode $existing = null): array
    {
        $data = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('discount_codes', 'code')->ignore($existing?->id),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'discount_type' => ['required', Rule::in(DiscountType::values())],
            'discount_value' => ['required', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'max_uses_per_user' => ['nullable', 'integer', 'min:1'],
            'min_order_amount' => ['nullable', 'integer', 'min:0'],
            'max_discount_amount' => ['nullable', 'integer', 'min:0'],
            'requires_link' => ['sometimes', 'boolean'],
            'restriction' => ['required', Rule::in(DiscountRestriction::values())],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'user_ids' => ['nullable', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $discountType = DiscountType::from($data['discount_type']);
        if ($discountType === DiscountType::Percent && (int) $data['discount_value'] > 100) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'discount_value' => 'درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.',
            ]);
        }

        return [
            'attributes' => [
                'code' => strtoupper(trim($data['code'])),
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'discount_type' => $discountType,
                'discount_value' => (int) $data['discount_value'],
                'is_active' => (bool) ($data['is_active'] ?? true),
                'starts_at' => $data['starts_at'] ?? null,
                'ends_at' => $data['ends_at'] ?? null,
                'max_uses' => $data['max_uses'] ?? null,
                'max_uses_per_user' => $data['max_uses_per_user'] ?? null,
                'min_order_amount' => $data['min_order_amount'] ?? null,
                'max_discount_amount' => $data['max_discount_amount'] ?? null,
                'requires_link' => (bool) ($data['requires_link'] ?? false),
                'restriction' => DiscountRestriction::from($data['restriction']),
            ],
            'product_ids' => array_values(array_unique(array_map('intval', $data['product_ids'] ?? []))),
            'user_ids' => array_values(array_unique(array_map('intval', $data['user_ids'] ?? []))),
        ];
    }

    /** @param array{product_ids: array<int>, user_ids: array<int>} $data */
    private function syncRelations(DiscountCode $discountCode, array $data): void
    {
        $discountCode->products()->sync($data['product_ids']);
        $discountCode->users()->sync($data['user_ids']);
    }
}
