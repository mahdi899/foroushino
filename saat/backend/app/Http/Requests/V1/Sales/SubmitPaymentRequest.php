<?php

namespace App\Http\Requests\V1\Sales;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitPaymentRequest extends FormRequest
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
            'method' => ['required', 'string', Rule::in(PaymentMethod::values())],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
