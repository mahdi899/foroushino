<?php

namespace App\Http\Requests\V1\FollowUps;

use App\Enums\FollowupKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFollowUpRequest extends FormRequest
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
            'kind' => ['required', 'string', Rule::in(FollowupKind::values())],
            'title' => ['required', 'string', 'max:150'],
            'due_at' => ['required', 'date'],
            'priority' => ['required', 'integer', 'min:1', 'max:3'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
