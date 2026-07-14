<?php

namespace App\Http\Requests\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppSettingsRequest extends FormRequest
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
        return [
            'settings' => ['required', 'array'],
            'settings.call_lock_minutes' => ['sometimes', 'integer', 'min:1', 'max:180'],
            'settings.min_call_duration_sec' => ['sometimes', 'integer', 'min:0', 'max:3600'],
            'settings.native_call_enabled' => ['sometimes', 'boolean'],
            'settings.voip_enabled' => ['sometimes', 'boolean'],
            'settings.default_call_method' => ['sometimes', 'string', 'in:native,voip'],
            'settings.voip_provider' => ['sometimes', 'string', 'max:50'],
            'settings.voip_fallback_to_native' => ['sometimes', 'boolean'],
            'settings.lead_pool_auto_return_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
            'settings.power_dial_default' => ['sometimes', 'boolean'],
            'settings.qa_sample_percent' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'settings.payout_minimum_amount' => ['sometimes', 'integer', 'min:0'],
            'settings.*' => ['nullable'],
        ];
    }
}
