<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\SaleStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScriptRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:150'],
            'stage' => ['required', 'string', Rule::in(SaleStage::values())],
            'content' => ['required', 'string'],
        ];
    }
}
