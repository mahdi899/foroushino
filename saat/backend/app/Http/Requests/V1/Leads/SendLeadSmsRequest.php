<?php

namespace App\Http\Requests\V1\Leads;

use App\Enums\LeadSmsTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendLeadSmsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('calls.manage');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'template' => ['required', 'string', Rule::enum(LeadSmsTemplate::class)],
            'body' => ['nullable', 'string', 'max:500', 'required_if:template,custom'],
        ];
    }
}
