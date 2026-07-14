<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\ObjectionKey;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreObjectionRequest extends FormRequest
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
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'key' => ['required', 'string', Rule::in(ObjectionKey::values())],
            'title' => ['required', 'string', 'max:150'],
            'suggested_response' => ['required', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
        ];
    }
}
