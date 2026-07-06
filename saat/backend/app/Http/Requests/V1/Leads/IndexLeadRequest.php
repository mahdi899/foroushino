<?php

namespace App\Http\Requests\V1\Leads;

use Illuminate\Foundation\Http\FormRequest;

class IndexLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', \App\Models\Lead::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string'],
            'temperature' => ['nullable', 'string'],
            'source' => ['nullable', 'string'],
            'search' => ['nullable', 'string', 'max:100'],
            'agent_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
