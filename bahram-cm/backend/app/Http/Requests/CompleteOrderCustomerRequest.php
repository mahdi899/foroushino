<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CompleteOrderCustomerRequest extends FormRequest
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
            'completion_token' => ['required', 'string', 'max:512'],
            'customer_name' => ['required', 'string', 'min:2', 'max:255'],
            'customer_email' => ['nullable', 'email', 'max:255'],
        ];
    }
}
