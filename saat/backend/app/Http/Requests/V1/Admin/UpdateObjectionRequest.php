<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\ObjectionKey;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateObjectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('training.manage');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['sometimes', 'nullable', 'integer', 'exists:products,id'],
            'key' => ['sometimes', 'required', 'string', Rule::in(ObjectionKey::values())],
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'suggested_response' => ['sometimes', 'required', 'string'],
            'category' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}
