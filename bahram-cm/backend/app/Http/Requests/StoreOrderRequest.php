<?php

namespace App\Http\Requests;

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
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:32'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_national_code' => ['nullable', 'string', 'max:20'],
            'customer_extra_data' => ['nullable', 'array'],
        ];
    }
}
