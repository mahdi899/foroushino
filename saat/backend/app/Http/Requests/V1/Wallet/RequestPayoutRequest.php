<?php

namespace App\Http\Requests\V1\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class RequestPayoutRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'min:1'],
        ];
    }
}
