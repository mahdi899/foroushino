<?php

namespace App\Http\Requests\V1\Shift;

use App\Enums\Availability;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartShiftRequest extends FormRequest
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
            'availability' => ['sometimes', 'string', Rule::in(Availability::values())],
        ];
    }
}
