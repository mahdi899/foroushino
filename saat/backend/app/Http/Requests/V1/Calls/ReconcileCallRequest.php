<?php

namespace App\Http\Requests\V1\Calls;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReconcileCallRequest extends FormRequest
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
            'outcome' => ['required', 'string', Rule::in(['answered', 'no_answer', 'cancelled'])],
        ];
    }
}
