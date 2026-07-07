<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashbackPayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'card_number' => ['required', 'digits:16'],
            'card_holder_name' => ['nullable', 'string', 'max:120'],
        ];
    }
}
