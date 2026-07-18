<?php

namespace App\Http\Requests\V1\Admin;

use App\Support\FlexibleLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('admin.products');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'slug' => ['sometimes', 'string', 'max:150', 'alpha_dash', Rule::unique('products', 'slug')->ignore($this->route('product'))],
            'category' => ['nullable', 'string', 'max:100'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'commission_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'description' => ['nullable', 'string'],
            'cover_image_url' => ['nullable', 'string', 'max:500'],
            'video_url' => FlexibleLink::rules(),
            'landing_url' => FlexibleLink::rules(),
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
