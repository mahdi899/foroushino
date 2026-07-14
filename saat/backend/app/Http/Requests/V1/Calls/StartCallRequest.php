<?php

namespace App\Http\Requests\V1\Calls;

use Illuminate\Foundation\Http\FormRequest;

class StartCallRequest extends FormRequest
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
            'lead_id' => ['required', 'integer', 'exists:leads,id'],
            'method' => ['sometimes', 'string', 'in:native,voip'],
        ];
    }
}
