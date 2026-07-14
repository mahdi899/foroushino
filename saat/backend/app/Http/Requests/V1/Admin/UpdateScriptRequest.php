<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\SaleStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateScriptRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'stage' => ['sometimes', 'required', 'string', Rule::in(SaleStage::values())],
            'content' => ['sometimes', 'required', 'string'],
        ];
    }
}
