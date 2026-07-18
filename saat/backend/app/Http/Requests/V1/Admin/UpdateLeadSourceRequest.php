<?php

namespace App\Http\Requests\V1\Admin;

use App\Models\LeadSourceCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLeadSourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('admin.settings');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var LeadSourceCatalog $leadSource */
        $leadSource = $this->route('leadSource');

        return [
            'slug' => [
                'sometimes',
                'string',
                'max:60',
                'alpha_dash',
                Rule::unique('lead_sources', 'slug')->ignore($leadSource->id),
                Rule::prohibitedIf(fn () => $leadSource->is_system),
            ],
            'label' => ['sometimes', 'string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
            'show_in_form' => ['nullable', 'boolean'],
        ];
    }
}
