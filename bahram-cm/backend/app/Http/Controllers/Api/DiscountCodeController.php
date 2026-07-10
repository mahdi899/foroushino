<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Services\DiscountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DiscountCodeController extends Controller
{
    public function __construct(private readonly DiscountService $discounts) {}

    public function validateCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'via_link' => ['nullable', 'boolean'],
            'customer_phone' => ['nullable', 'string', 'max:32'],
        ]);

        $product = Product::query()->active()->find($data['product_id']);
        if (! $product) {
            throw ValidationException::withMessages([
                'product_id' => 'محصول انتخاب‌شده در دسترس نیست.',
            ]);
        }

        $user = $request->user();
        if ($user instanceof User && $user->is_admin) {
            $user = null;
        }

        $preview = $this->discounts->preview(
            $data['code'],
            $product,
            $user,
            $data['customer_phone'] ?? null,
            (bool) ($data['via_link'] ?? false),
        );

        $discountCode = $preview['discount_code'];

        return response()->json([
            'data' => [
                'code' => $discountCode->normalizedCode(),
                'title' => $discountCode->title,
                'discount_type' => $discountCode->discount_type->value,
                'discount_value' => $discountCode->discount_value,
                'subtotal' => $preview['subtotal'],
                'coupon_discount' => $preview['coupon_discount'],
                'final_amount' => $preview['final_amount'],
            ],
        ]);
    }
}
