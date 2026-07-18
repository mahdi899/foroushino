<?php

namespace App\Http\Requests\V1\Leads;

use App\Enums\ExperienceLevel;
use App\Enums\Temperature;
use App\Rules\ActiveLeadSourceSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('leads.manage');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['nullable', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:120'],
            'source' => ['nullable', 'string', 'max:60', new ActiveLeadSourceSlug],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'temperature' => ['nullable', 'string', Rule::enum(Temperature::class)],
            'priority' => ['nullable', 'integer', Rule::in([1, 2, 3])],
            'budget' => ['nullable', 'string', 'max:120'],
            'job' => ['nullable', 'string', 'max:120'],
            'experience' => ['nullable', 'string', Rule::enum(ExperienceLevel::class)],
            'income_goal' => ['nullable', 'string', 'max:120'],
            'interest_reason' => ['nullable', 'string', 'max:2000'],
            'best_call_time' => ['nullable', 'string', 'max:120'],
            'pain_point' => ['nullable', 'string', 'max:2000'],
            'last_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
