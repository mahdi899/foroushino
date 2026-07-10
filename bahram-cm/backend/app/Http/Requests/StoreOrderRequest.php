<?php

namespace App\Http\Requests;

use App\Support\Mobile;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:32', function (string $attribute, mixed $value, \Closure $fail) {
                if (! Mobile::isValid((string) $value)) {
                    $fail('شماره موبایل معتبر نیست.');
                }
            }],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_national_code' => ['nullable', 'string', 'max:20'],
            'customer_extra_data' => ['nullable', 'array'],
            'ref' => ['nullable', 'string', 'max:20'],
            'coupon' => ['nullable', 'string', 'max:50'],
            'coupon_via_link' => ['nullable', 'boolean'],
        ];
    }
}
